import "reflect-metadata"; // this shim is required
import {createExpressServer} from "routing-controllers";
import {UserController} from "./controllers/UserController";

// creates express app, registers all controller routes and returns you express app instance
const app = createExpressServer({
   controllers: [UserController] // we specify controllers we want to use
});

// run express application on port 3000
app.listen(3000);
