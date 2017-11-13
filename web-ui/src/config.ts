import axios, {AxiosResponse} from "axios";

const API_URL = "http://192.168.99.100:3000" || "https://kotorimusic.ga/api";

export const http = axios.create({
    baseURL: API_URL
});

// This ensures that we always use the most recent authorization info retrieved by the server
// without having to care about it, automagically
http.interceptors.response.use((config: AxiosResponse): AxiosResponse => {
    if (config.headers.authorization) {
        http.defaults.headers.authorization = config.headers.authorization;
    }
    return config;
});
