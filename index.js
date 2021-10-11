class APromise {
  constructor(fn) {
    if (typeof fn !== 'function') {
      throw new TypeError('init parameter must be a function');
    }

    this.state = 'pending';
    this.value = null;
    this.reason = null;
    // https://promisesaplus.com/#point-36
    this.fulfilledQue = [];
    this.rejectedQue = [];

    try {
      fn(this.resolve, this.reject);
    } catch (e) {
      this.reject(e);
    }
  }

  resolve = (value) => {
    if (this.state === 'pending') {
      this.state = 'fulfilled';
      this.value = value;

      // https://promisesaplus.com/#point-26
      // https://promisesaplus.com/#point-34
      setTimeout(() => {
        this.fulfilledQue.forEach((resolveCb) => {
          this.value = resolveCb(this.value);
        });
      });
    }
  };

  reject = (reason) => {
    if (this.state === 'pending') {
      this.state = 'rejected';
      this.reason = reason;

      // https://promisesaplus.com/#point-26
      // https://promisesaplus.com/#point-34
      setTimeout(() => {
        this.rejectedQue.forEach((rejectCb) => {
          this.reason = rejectCb(this.reason);
        });
      });
    }
  };

  then = (onFulfilled, onRejected) => {
    // https://promisesaplus.com/#point-40
    const newPromise = new APromise((resolve, reject) => {
      // https://promisesaplus.com/#point-23
      if (typeof onFulfilled === 'function') {
        this.fulfilledQue.push((value) => {
          try {
            // https://promisesaplus.com/#point-41
            const x = onFulfilled(value);
            this.resolvePromise(newPromise, x, resolve, reject);
          } catch (e) {
            // https://promisesaplus.com/#point-42
            reject(e);
          }
        });
      } else {
        this.resolvePromise(
          newPromise,
          this,
          (value) => value,
          (reason) => reason
        );
      }

      if (typeof onRejected === 'function') {
        this.rejectedQue.push((reason) => {
          try {
            const x = onRejected(reason);
            this.resolvePromise(newPromise, x, resolve, reject);
          } catch (e) {
            reject(e);
          }
        });
      }
    });

    return newPromise;
  };

  resolvePromise = (promise, x, resolve, reject) => {
    // https://promisesaplus.com/#point-48
    // 如果then提供的onFulfilled或者onRejected函数执行返回的值和then返回的是同一个promise，会导致下文this.resolvePromise重复调用，形成死循环
    if (promise === x) {
      reject(new TypeError('then must return a different promise with fulfilled callback'));
    }

    // https://promisesaplus.com/#point-49
    if (x instanceof APromise) {
      // https://promisesaplus.com/#point-50
      if (x.state === 'pending') {
        x.then(
          (value) => {
            this.resolvePromise(promise, value);
          },
          (reason) => {
            reject(reason);
          }
        );
      } else {
        // https://promisesaplus.com/#point-51
        x.then(resolve, reject);
      }
    } else if (typeof x === 'function' || typeof x === 'object') {
      // https://promisesaplus.com/#point-53
      let then;
      // https://promisesaplus.com/#point-59
      // 保证x.then提供的回调函数只会被执行一次
      let hasBeenResolved = false;
      try {
        then = x.then;
        // https://promisesaplus.com/#point-56
        if (typeof then === 'function') {
          then.call(
            x,
            (y) => {
              if (!hasBeenResolved) {
                hasBeenResolved = true;
                // https://promisesaplus.com/#point-57
                this.resolvePromise(promise, y);
              }
            },
            (r) => {
              if (!hasBeenResolved) {
                hasBeenResolved = true;
                reject(r);
              }
            }
          );
        } else {
          // https://promisesaplus.com/#point-63
          resolve(x);
        }
      } catch (e) {
        // https://promisesaplus.com/#point-60
        if (!hasBeenResolved) {
          reject(e);
        }
      }
    } else {
      // https://promisesaplus.com/#point-64
      resolve(x);
    }
  };
}

/**
 * 测试入口
 */
APromise.defer = APromise.deferred = function () {
  let dfd = {};
  dfd.promise = new APromise((resolve, reject) => {
    dfd.resolve = resolve;
    dfd.reject = reject;
  });
  return dfd;
};

module.exports = APromise;
