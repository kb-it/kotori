import axios from "axios"

const API_URL = "https://kotorimusic.ga/api";

export const http = axios.create({baseURL: API_URL});
