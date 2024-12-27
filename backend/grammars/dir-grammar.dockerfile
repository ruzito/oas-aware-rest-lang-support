# docker buildx build -t tree_sitter_sqlite_wasm  --output . .
FROM rust:latest AS tree-sitter

ARG NODE_VERSION=20
ARG TREE_SITTER_NAME
ARG TREE_SITTER_GRAMMAR_LOCATION

WORKDIR /tree-sitter
# Remove imagemagick due to https://security-tracker.debian.org/tracker/CVE-2019-10131
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get purge -y imagemagick imagemagick-6-common \
    && apt-get install -y git \
    && apt-get install -y curl \
    && apt-get install -y python3 \
    && apt-get install -y cmake

RUN curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x -o nodesource_setup.sh \
    && bash nodesource_setup.sh \
    && apt-get install -y nodejs

# Rust and Cargo is installed already
RUN cargo install tree-sitter-cli

WORKDIR /em
RUN git clone https://github.com/emscripten-core/emsdk.git
RUN /em/emsdk/emsdk install latest
RUN /em/emsdk/emsdk activate latest
WORKDIR /em/emsdk
RUN chmod +x /em/emsdk/emsdk_env.sh \
    && . ./emsdk_env.sh

# Setting the path via the emsdk_env.sh call doesn't persist, so we need to set it here
ENV PATH="/em/emsdk:/em/emsdk/upstream/emscripten:${PATH}"

ADD ${TREE_SITTER_GRAMMAR_LOCATION} /tree-sitter/${TREE_SITTER_NAME}
ADD scripts /scripts

WORKDIR /tree-sitter/${TREE_SITTER_NAME}
RUN /scripts/prepare-grammar-workdir.sh ${TREE_SITTER_NAME}
RUN tree-sitter generate
RUN tree-sitter build --wasm

# This needs to be multistaged with scratch
# so that --output . . only copies out
# what we explicitly copied into the scratch image
FROM scratch
ARG TREE_SITTER_NAME
COPY --from=tree-sitter /tree-sitter/${TREE_SITTER_NAME}/. ./codegen/${TREE_SITTER_NAME}/.

