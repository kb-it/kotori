// make sure that exit is hookable and doesn't lead to a process.exit for nodejs
Module["preInit"] = function() {
    if (ENVIRONMENT_IS_NODE) {
        exit = Module["exit"] = function(status) {
            ABORT = true;
            EXITSTATUS = status;
            STACKTOP = initialStackTop;
            exitRuntime();
            if (Module["onExit"]) Module["onExit"](status);
            throw new ExitStatus(status);
        };
    }
};
