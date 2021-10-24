import { Nuanc } from "./core/index.js"
import { NuancGoogleCloudStorageDriver } from "./data/google-cloud-storage.js"


export default Nuanc
export const Drivers = {
    GoogleCloudStorage: NuancGoogleCloudStorageDriver
}