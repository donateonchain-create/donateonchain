import { request, apiPath } from './client'
import type {
  OrderApi,
  PaginatedResponse,
  OrdersQuery,
  CreateOrderBody,
} from '../types/api'

export function getOrders(
  query: OrdersQuery = {}
): Promise<PaginatedResponse<OrderApi>> {
  const params = new URLSearchParams()
  if (query.buyer) params.set('buyer', query.buyer)
  if (query.page != null) params.set('page', String(query.page))
  if (query.limit != null) params.set('limit', String(query.limit))
  const qs = params.toString()
  return request(apiPath(`/api/orders${qs ? `?${qs}` : ''}`), { method: 'GET' })
}

export function createOrder(body: CreateOrderBody): Promise<OrderApi> {
  return request(apiPath('/api/orders'), {
    method: 'POST',
    body: {
      buyer: body.buyer,
      items: body.items,
      totalHBAR: body.totalHBAR,
      txHashes: body.txHashes,
    },
  })
}
