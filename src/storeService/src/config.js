import dotenv from "dotenv";

dotenv.config();
export default function configuration() {
    return {
        port : process.env.PORT || 3000
    }
}
    