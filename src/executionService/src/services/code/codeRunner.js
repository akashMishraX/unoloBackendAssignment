import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import yaml from 'yamljs';

export default class CodeService {
  constructor(codeFile, yamlString) {
    this.yamlString = yamlString;
    this.config = this.loadConfig();

    // Define the sandbox directory path and create it if it doesn't exist.
    this.sandboxDir = path.join(process.cwd(), 'sandbox');
    if (!fs.existsSync(this.sandboxDir)) {
      fs.mkdirSync(this.sandboxDir, { recursive: true });
    }

    // If codeFile is a valid path on disk, copy it into the sandbox folder;
    // otherwise, assume it's code content and write it as a new file inside sandbox.
    if (fs.existsSync(codeFile)) {
      const fileName = path.basename(codeFile);
      const destination = path.join(this.sandboxDir, fileName);
      fs.copyFileSync(codeFile, destination);
      this.codeFile = destination;
    } else {
      // Determine language from configuration or default to 'node'
      const lang = this.config.language ? this.config.language : 'node';
      let fileName;
      if (lang === 'python') {
        fileName = 'main.py';
      } else if (lang === 'node') {
        fileName = 'index.js';
      } else if (lang === 'go') {
        fileName = 'main.go';
      } else {
        fileName = 'code.txt';
      }
      const fullPath = path.join(this.sandboxDir, fileName);
      fs.writeFileSync(fullPath, codeFile, 'utf8');
      this.codeFile = fullPath;
    }

    // Determine language based on configuration or file extension.
    this.language = this.determineLanguage();

    // Create a unique Docker image tag.
    this.imageTag = `job-runner-${Date.now()}`;
  }

  // Parse the YAML configuration string.
  loadConfig() {
    try {
      return yaml.parse(this.yamlString) || {};
    } catch (error) {
      throw new Error('Error parsing YAML configuration: ' + error.message);
    }
  }

  // Determine the language from config or file extension.
  determineLanguage() {
    if (this.config.language) return this.config.language;
    const ext = path.extname(this.codeFile);
    const extensionMap = {
      '.py': 'python',
      '.js': 'node',
      '.go': 'go',
      '.ts': 'node'
    };
    return extensionMap[ext] || 'node';
  }

  // Extract requirements from the code file if they exist.
  extractRequirements() {
    const code = fs.readFileSync(this.codeFile, 'utf8');
    const requirementPatterns = {
      python: /# *@requirements\s*\n((?:# *[^\n]+\n)+)/,
      node: /\/\/ *@requirements\s*\n((?:\/\/ *[^\n]+\n)+)/,
      go: /\/\/ *@requirements\s*\n((?:\/\/ *[^\n]+\n)+)/
    };
    const pattern = requirementPatterns[this.language];
    if (!pattern) return [];

    const match = code.match(pattern);
    if (!match) return [];

    const requirementsBlock = match[1];
    const requirements = requirementsBlock
      .split('\n')
      .map(line => line.replace(/^#\s*|^\/\/\s*/, '').trim())
      .filter(line => line && !line.startsWith('@'));
    return requirements;
  }

  // Generate a requirements file if any requirements are found.
  generateRequirementsFile() {
    const requirements = this.extractRequirements();
    if (requirements.length === 0) return null;

    const requirementsPath = path.join(path.dirname(this.codeFile), 'requirements.txt');
    fs.writeFileSync(requirementsPath, requirements.join('\n'), 'utf8');
    return requirementsPath;
  }

  // Create a Dockerfile based on language-specific settings and configuration.
  generateDockerfile() {
    const languageConfigs = {
      python: {
        baseImage: 'python:3.9-slim',
        installCommand: 'RUN pip install -r requirements.txt',
        entrypoint: 'python ' + path.basename(this.codeFile)
      },
      node: {
        baseImage: 'node:14-alpine',
        installCommand: 'RUN npm install',
        entrypoint: 'node ' + path.basename(this.codeFile)
      },
      go: {
        baseImage: 'golang:1.16-alpine',
        installCommand: '',
        entrypoint: './' + path.basename(this.codeFile)
      }
    };

    const langConfig = languageConfigs[this.language];
    let dockerfileContent = `FROM ${this.config.baseImage || langConfig.baseImage}\n`;
    dockerfileContent += 'WORKDIR /app\n';

    const requirementsPath = this.generateRequirementsFile();
    if (requirementsPath) {
      const requirementsFileName = path.basename(requirementsPath);
      dockerfileContent += `COPY ${requirementsFileName} .\n`;
      dockerfileContent += `${langConfig.installCommand}\n`;
    }

    const fileName = path.basename(this.codeFile);
    dockerfileContent += `COPY ${fileName} .\n`;

    const entrypoint = this.config.entrypoint || langConfig.entrypoint;
    dockerfileContent += `CMD ["sh", "-c", "${entrypoint}"]\n`;

    const dockerfilePath = path.join(path.dirname(this.codeFile), 'Dockerfile');
    fs.writeFileSync(dockerfilePath, dockerfileContent, 'utf8');
    console.log('Dockerfile created at:', dockerfilePath);
  }

  // Build the Docker image using the command-line interface.
  buildImage() {
    return new Promise((resolve, reject) => {
      const command = `docker build -t ${this.imageTag} ${path.dirname(this.codeFile)}`;
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error('Error building docker image:', error);
          return reject(stderr || error);
        }
        console.log('Docker image built successfully.');
        resolve(stdout);
      });
    });
  }

  // Run the built Docker container.
  runContainer() {
    return new Promise((resolve, reject) => {
      const command = `docker run --rm ${this.imageTag}`;
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error('Error running docker container:', error);
          return reject(stderr || error);
        }
        console.log('Container executed successfully.');
        resolve(stdout);
      });
    });
  }

  // Execute the entire job pipeline: generate Dockerfile, build the image, run the container, and clean up.
  async executeJob() {
    try {
      this.generateDockerfile();
      await this.buildImage();
      const output = await this.runContainer();
      return output;
    } catch (err) {
      console.error('Job execution failed:', err);
      throw err;
    } finally {
      exec(`docker rmi ${this.imageTag}`, (error, stdout, stderr) => {
        if (error) {
          console.error('Error removing image:', error);
        } else {
          console.log('Cleaned up docker image.');
        }
      });
      exec(`rm -rf ${this.sandboxDir}`, (error, stdout, stderr) => {
        if (error) {
          console.error('Error removing sandbox directory:', error);
        } else {
          console.log('Cleaned up sandbox directory.');
        }
      });
    }
  }
}
