const Funcs = {
    setValues(args, callback) {
        Object.values(args).forEach(callback);
    },
};

export const { setValues } = Funcs;
