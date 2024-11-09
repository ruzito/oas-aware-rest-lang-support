# docker buildx build -t tree_sitter_sqlite_wasm  --output . .
FROM rust:latest AS tree-sitter

ARG NODE_VERSION=20
ARG TREE_SITTER_GRAMMAR_GIT_URL=https://github.com/rest-nvim/tree-sitter-http
ARG TREE_SITTER_NAME=tree-sitter-http

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

WORKDIR /tree-sitter
RUN git clone ${TREE_SITTER_GRAMMAR_GIT_URL}
WORKDIR /tree-sitter/${TREE_SITTER_NAME}
RUN tree-sitter generate
RUN tree-sitter build --wasm

# Without the extra step here, the buildkit copy to the host doesn't work
FROM tree-sitter AS built
# This is a hack to get the wasm file out of the tree-sitter layer
WORKDIR /built
COPY --from=tree-sitter /tree-sitter/${TREE_SITTER_NAME}/${TREE_SITTER_NAME}.wasm .

FROM scratch
COPY --from=built /built/. .

