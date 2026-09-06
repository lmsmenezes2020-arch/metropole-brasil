/** Compare-and-swap via documented Netlify Blobs conditional writes (SDK >= 11.0.2).
 * Fail closed on an empty ETag: some SDK releases misreport non-412 HTTP failures
 * as successful conditional writes. See Netlify primitives issue #741.
 */
export function blobRepository(store) {
  async function write(key, data, condition) {
    const result = await store.set(key, JSON.stringify(data), condition);
    if (result?.modified === false) return false;
    if (result?.modified !== true || !result.etag) throw new Error('Unconfirmed conditional write');
    return true;
  }
  return {
    async read(key) {
      const result = await store.getWithMetadata(key, { type: 'json' });
      if (result == null) return null;
      if (!result.etag || !result.data) throw new Error('Invalid storage response');
      return { data: result.data, etag: result.etag };
    },
    create: (key, data) => write(key, data, { onlyIfNew: true }),
    compareAndSwap: (key, data, etag) => write(key, data, { onlyIfMatch: etag })
  };
}
