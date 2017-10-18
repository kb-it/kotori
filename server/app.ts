import "reflect-metadata"; // this shim is required
import {createExpressServer} from "routing-controllers";
import {UserController} from "./controllers/UserController";
import {SongController} from "./controllers/SongController";

// creates express app, registers all controller routes and returns you express app instance
const app = createExpressServer({
        controllers: [UserController, SongController] // we specify controllers we want to use
    });

// run express application
app.listen(parseInt(String(process.env.EXPRESS_PORT), 10));
