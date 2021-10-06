export default class Command {
  constructor(name, description) {
    this.name = name;
    this.description = description;
  }

  async execute() {}
}
