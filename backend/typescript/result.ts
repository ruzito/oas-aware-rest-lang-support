
export default interface Result<Ok, Err> {
    map<O>(f: (value: Ok) => O): Result<O, Err>;
    flatMap<O>(f: (value: Ok) => Result<O, Err>): Result<O, Err>;
    match<O>(x: { Ok: (v: Ok) => O; Err: (v: Err) => O }): O;
}

export const Ok = <Ok, Err = any>(value: Ok): Result<Ok, Err> => ({
    map: <O>(f: (value: Ok) => O): Result<O, Err> => {
        try {
            return Ok<O, Err>(f(value));
        } catch (e) {
            return Err<O, Err>(e as Err);
        }
    },
    flatMap: <O>(f: (value: Ok) => Result<O, Err>): Result<O, Err> => {
        try {
            return f(value);
        } catch (e) {
            return Err<O, Err>(e as Err);
        }
    },
    match: ({ Ok }) => Ok(value)
});

export const Err = <Ok, Err = any>(value: Err): Result<Ok, Err> => ({
    map: <O>(_: (value: Ok) => O): Result<O, Err> => Err(value),
    flatMap: <O>(_f: (value: Ok) => Result<O, Err>): Result<O, Err> => Err(value),
    match: ({ Err }) => Err(value)
});
