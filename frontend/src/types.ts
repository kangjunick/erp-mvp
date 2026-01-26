export type OrderStatus = 'pending' | 'purchased' | 'reviewed'

export type Order = {
  id: string
  mall_name: string
  product_name: string
  keyword?: string | null
  option_text?: string | null
  status: OrderStatus
  invoice_number?: string | null
  review_screenshot_url?: string | null
}

