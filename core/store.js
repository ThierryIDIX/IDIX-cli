import fs from "fs";
import Configstore from "configstore";

const { name } = JSON.parse(fs.readFileSync("package.json", "utf8"));
export default new Configstore(name, {});
