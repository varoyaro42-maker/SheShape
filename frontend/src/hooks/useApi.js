import { useEffect, useState } from 'react'
import axios from 'axios'
import { api, readError } from '../api/client.js'

export function useApi(path, params) {
  const [state, setState] = useState({
    data: null,
    meta: null,
    loading: true,
    error: null
  })

  const serialized = JSON.stringify(params ?? {})

  useEffect(() => {
    const controller = new AbortController()
    let active = true

    setState((previous) => ({ ...previous, loading: true, error: null }))

    api
      .get(path, { params: JSON.parse(serialized), signal: controller.signal })
      .then((response) => {
        if (!active) return
        setState({
          data: response.data.data,
          meta: response.data.meta ?? null,
          loading: false,
          error: null
        })
      })
      .catch((error) => {
        if (!active || axios.isCancel(error)) return
        setState({ data: null, meta: null, loading: false, error: readError(error) })
      })

    return () => {
      active = false
      controller.abort()
    }
  }, [path, serialized])

  return state
}
