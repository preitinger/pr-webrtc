export interface LoginRequest {
    name: string;
}

export interface LoginResponse {
    error: string | null;
    users: string[];
}