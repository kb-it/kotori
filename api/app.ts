import "reflect-metadata"; // this shim is required
import {createExpressServer} from "routing-controllers";
import {AppConfig} from "./config/AppConfig";
import {UserController} from "./controllers/UserController";
import {SongController} from "./controllers/SongController";

// creates express app, registers all controller routes and returns you express app instance
const app = createExpressServer({
    defaultErrorHandler: false,
    cors: {
        origin: "*",
        methods: "GET,HEAD,PUT,PATCH,POST,DELETE"
    },
    controllers: [UserController, SongController] // we specify controllers we want to use
});

// run express application
app.listen(AppConfig.EXPRESS_PORT);
console.log("server running & listening on port:", AppConfig.EXPRESS_PORT);
