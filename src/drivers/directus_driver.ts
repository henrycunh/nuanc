import { Directus } from '@directus/sdk';
import * as dotenv from 'dotenv';
import consola from 'consola'
dotenv.config()



export class DirectusD {
    static async updateItem(changesList:any) {
        const login: string = process.env.DIRECTUS_LOGIN || ""
        const password: string = process.env.DIRECTUS_PASSWORD || ""
        const host: string = process.env.DIRECTUS_HOST || ""
        
        if (!login || !password || !host){
            consola.error("Missing variables in the dotenv file")
            return
        }  
        
        const directus = new Directus(host);

        await directus.auth.login({
            email: login,
            password: password,
        });

        
        const workspace = "Developer Portal UI"
        const changedList = changesList.changed
        for (const element in changedList){
            await directus.items('page_event').createOne({
                "date_created": Date.now(),
                "date_updated": null,
                "page_id": changedList[element].id,
                "changes": changedList[element].changed,
                workspace: workspace
            });
        }

        
        
        
    } 

}
