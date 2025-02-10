import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import fs from "fs";

import yaml from "yamljs";
import substitute from "shellsubstitute"


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config();
export default function swagger() {


    // Load the YAML file
    const swaggerFilePath = path.join(__dirname, "../swagger.yaml");
    const swaggerConfig = yaml.load(swaggerFilePath);

    // Stringify the JSON content and substitute environment variables
    const JSONconfigWithEnvVars = substitute(JSON.stringify(swaggerConfig, null, 2), process.env);

    // Parse the JSON back to YAML
    const swaggerConfigWithEnvVars = yaml.stringify(JSON.parse(JSONconfigWithEnvVars));


    const swaggerFilePath2 = path.join(__dirname, "../swagger-dyanmic.yaml");
    // Write the updated YAML to a new file
    fs.writeFileSync(swaggerFilePath2, swaggerConfigWithEnvVars);


    // Resolve the directory of the current module

    console.log(__dirname);
    const swaggerDocument = yaml.load(path.join(__dirname, "../swagger-dyanmic.yaml"));

    return swaggerDocument
}