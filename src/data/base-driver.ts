import { PageStatus, Snapshot } from "../@types/index.js";

// TODO: document this interface
export interface NuancBaseDataDriver {

    saveSnapshot (snapshot: Snapshot, database?: string): Promise<void>
    loadLastSnapshot (database?: string): Promise<Snapshot | null>
    saveEvent (pageStatus: PageStatus, database?: string): Promise<void>

    
}