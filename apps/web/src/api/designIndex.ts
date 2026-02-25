import { request, apiPath } from './client'
import type { DesignIndexApi } from '../types/api'

export function getDesignIndex(designId: string): Promise<DesignIndexApi | null> {
  return request<DesignIndexApi>(apiPath(`/api/design-index/${encodeURIComponent(designId)}`), {
    method: 'GET',
  }).catch((e: any) => {
    if (e?.status === 404) return null
    throw e
  })
}

export interface UpsertDesignIndexBody {
  metadataCid: string
  previewCid?: string
  designCid?: string
}

export function upsertDesignIndex(
  designId: string,
  body: UpsertDesignIndexBody,
  adminApiKey: string
): Promise<DesignIndexApi> {
  return request(apiPath(`/api/design-index/${encodeURIComponent(designId)}`), {
    method: 'PUT',
    headers: { 'x-api-key': adminApiKey },
    body: {
      metadataCid: body.metadataCid,
      previewCid: body.previewCid,
      designCid: body.designCid,
    },
  })
}
