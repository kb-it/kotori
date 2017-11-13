import {AxiosError} from "axios";

export function handleHttpError(_: string, err: AxiosError) {
    let msg = "";

    if (err.response && err.response.data && err.response.data.error) {
        msg = err.response.data.error;
    }
    return msg;
}

export function goToHome() {
    this.$router.push({path: "/"});
}
