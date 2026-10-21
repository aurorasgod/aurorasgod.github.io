// Keep the same event across retries, and mark it sent only after acknowledgement.
export function createVisitDelivery(send) {
  let delivered = false;
  let pending;
  return {
    get delivered() { return delivered; },
    run() {
      if (delivered) return Promise.resolve(false);
      if (pending) return pending;
      pending = Promise.resolve().then(send).then(() => {
        delivered = true;
        return true;
      }).finally(() => { pending = undefined; });
      return pending;
    },
  };
}
