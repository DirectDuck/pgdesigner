import { ApiRpcError, ApiConnectionError } from './errors'
import { JsonRpcErrorCode } from './rpc'
import type { IRpcRequest, IRpcResponse, RpcParams } from './rpc'

export interface HttpRpcClientOptions {
  url: string
}

const isValidRpcResponse = (obj: unknown): obj is IRpcResponse => {
  if (typeof obj !== 'object' || obj === null) return false
  const r = obj as Record<string, unknown>
  return r.jsonrpc === '2.0' && (r.result !== undefined || r.error !== undefined)
}

export default class HttpRpcClient {
  url: string
  private nextId = 0

  constructor({ url }: HttpRpcClientOptions) {
    this.url = url
  }

  call = async (method: string, params: RpcParams = {}) => {
    const req: IRpcRequest = {
      jsonrpc: '2.0',
      id: ++this.nextId,
      method,
      params,
    }

    try {
      const resp = await fetch(`${this.url}?method=${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(req),
      })

      if (!resp.ok) {
        throw new ApiRpcError({
          method,
          params,
          error: { code: resp.status, message: `HTTP ${resp.status}`, data: '' },
        })
      }

      const data = await resp.json()
      if (!isValidRpcResponse(data)) {
        throw new ApiRpcError({
          method,
          params,
          error: { code: JsonRpcErrorCode.PARSE_ERROR, message: 'Invalid JSON-RPC response', data: '' },
        })
      }

      if (data.error) {
        throw new ApiRpcError({ method, params, error: data.error })
      }

      return data.result
    } catch (err) {
      if (err instanceof ApiRpcError) throw err
      throw new ApiConnectionError(err)
    }
  }
}
