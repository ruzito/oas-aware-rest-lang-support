import {test, describe} from "node:test";
import assert from "node:assert/strict";

import * as fs from 'fs';

const int_pkg_json = JSON.parse(fs.readFileSync('./package.json'));
const bench_pkg_json = JSON.parse(fs.readFileSync('../test_benchmarks/package.json'));
const asm_pkg_json = JSON.parse(fs.readFileSync('../backend/package.json'));

const pub_pkgs = [asm_pkg_json]
const priv_pkgs = [int_pkg_json, bench_pkg_json]

const pkgs = [...pub_pkgs, ...priv_pkgs]

describe("package.json integrity", () => {
    test("test_integration should be private package", () => {
        assert.strictEqual(int_pkg_json["private"], true)
    })
    test("benchmarks should be private package", () => {
        assert.strictEqual(bench_pkg_json["private"], true)
    })
    test("public packages should have set a git repository", () => {
        for (let i in pub_pkgs) {
            let pkg = pub_pkgs[i]
            assert.strict(pkg["repository"], `package "${pkg["name"]}" does not declare a repository`)
            assert.strictEqual(pkg["repository"]["type"], "git", `package "${pkg["name"]}" does not declare use a git repository`)
        }
    })
    test("public packages should have set same git repository", () => {
        let repo = pub_pkgs[0]["repository"]["url"]
        for (let i in pub_pkgs) {
            let pkg = pub_pkgs[i]
            assert.strict(pkg["repository"], `package "${pkg["name"]}" does not declare a repository`)
            assert.strictEqual(pkg["repository"]["url"], repo, `package "${pkg["name"]}" does not declare the same git repository as "${pub_pkgs[0]["name"]}"`)
        }
    })
    test("public packages should have set same semver (for now we do not support differing versions of packages)", () => {
        let ver = pub_pkgs[0]["version"]
        for (let i in pub_pkgs) {
            let pkg = pub_pkgs[i]
            assert.strictEqual(pkg["version"], ver, `package "${pkg["name"]}" does not declare the same version as "${pub_pkgs[0]["name"]}"`)
        }
    })
    test("basic package json stuff", () => {
        for (let i in pkgs) {
            let pkg = pkgs[i]
            assert.strict(pkg["name"], "some package does not have a name")
            let name = pkg["name"]
            assert.strict(pkg["author"], `package "${name}" does not specify author`)
            assert.strict(pkg["license"], `package "${name}" does not specify license`)
            assert.strictEqual(pkg["license"], "MIT", `package "${name}" does not specify license to be MIT`)
        }
    })
})