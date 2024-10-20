type Header = {key: string, value: string}

type Completion = {type: string, text: string, detail: string}
type Docs = {brief: string, text: string}

type Support = Completion | Docs

export function set_oas_url(url: string) {

}

export function set_headers(arr: Header[]) {

}

export function set_start_line(start_line: string) {

}

export function get(code: string, offset: number): Support[] {
    return []
}