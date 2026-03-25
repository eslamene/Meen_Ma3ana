import http from 'k6/http'
import { check, sleep } from 'k6'

export const options = {
  vus: 10,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<400'],
    http_req_failed: ['rate<0.01'],
  },
}

const baseUrl = __ENV.LOAD_BASE_URL || 'http://localhost:3000'

export default function () {
  const res = http.get(`${baseUrl}/api/auth/availability?email=loadtest@example.com`)
  check(res, {
    'status is 200': (r) => r.status === 200,
  })
  sleep(1)
}
