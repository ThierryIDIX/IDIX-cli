const STATUS_CODES = ["success", "error", "info"];

export default class CommandResult {
  constructor(status, message) {
    this.status = status;
    this.message = message;
    this.validate();
  }

  validate() {
    const { status } = this;
    if (!STATUS_CODES.includes(status)) {
      throw new Error(
        `CommandResult#validate : status "${status}" is not valid. Must be one of these : "${STATUS_CODES}".`
      );
    }
  }

  isSuccess() {
    return this.status === "success";
  }

  display() {}
}
