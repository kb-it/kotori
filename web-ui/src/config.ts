import axios, {AxiosResponse} from "axios";

const API_URL = "https://kotorimusic.ga/api";

export const http = axios.create({
    baseURL: API_URL,
    headers: {
        authorization: localStorage.getItem("token")
    }
});

// This ensures that we always use the most recent authorization info retrieved by the server
// without having to care about it, automagically
http.interceptors.response.use((config: AxiosResponse): AxiosResponse => {
    if (config.headers.authorization) {
        http.defaults.headers.authorization = config.headers.authorization;
        localStorage.setItem("token", config.headers.authorization);
    }
    return config;
});
