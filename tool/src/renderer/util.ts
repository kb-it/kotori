import {AxiosError} from "axios"
import {remote} from "electron"

export function handleHttpError(type: string, err: AxiosError) {
    let msg = err.message;
    if (err.response && err.response.data && err.response.data.error) {
        msg = err.response.data.error;
    }
    remote.dialog.showErrorBox(type, msg);
}
