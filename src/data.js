const { MessagePort} = require('worker_threads');

export default interface Data {
  port: MessagePort;
  value: number;
}
