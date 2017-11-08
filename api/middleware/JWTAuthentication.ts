"use strict";
import {Request, Response} from "express";
import {ExpressMiddlewareInterface} from "routing-controllers";
import {JWT} from "../auth/JWTSingleton";
import * as HTTP_STATUS_CODE from "http-status-codes";
import {Utils} from "../utils/Utils";

export class JWTAuthentication implements ExpressMiddlewareInterface {
    async use(request: Request, response: Response, next: (err?: any) => any): Promise<any> {
        const tokenMatchGroups = /^Bearer (.*)/.exec(String(request.get("Authorization"))),
            token = tokenMatchGroups && tokenMatchGroups[tokenMatchGroups.length - 1],
            jwt = JWT.getInstance();
        let user,
            refreshedToken;

        if (token) {
            try {
                user = await jwt.verify(token);
                refreshedToken = await jwt.getUserJWT(user.id);

                // everything seems alright, so store user-data in request-object for use in other routes
                (<any> request).user = user;
                // add jwt, which shall now be used from client, as tokens are only valid for a few minutes, to response
                Utils.addJWTToResponse(response, refreshedToken);
                next();
            } catch (e) {
                console.error(e);
                return response.status(HTTP_STATUS_CODE.UNAUTHORIZED).json({
                    success: false,
                    message: e.message
                });
            }
        } else {
            return response.status(HTTP_STATUS_CODE.FORBIDDEN).send({
                success: false,
                message: "Request failed. Not logged in."
            });
        }
    }
}
