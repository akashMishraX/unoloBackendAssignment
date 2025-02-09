import { PrismaClient } from '@prisma/client';

export default class PrismaClientSingleton {
    static instance = null;
    static getInstance() {
        if (this.instance === null) {
            return new PrismaClient();
            
        }
        return this.instance;
    }
}
