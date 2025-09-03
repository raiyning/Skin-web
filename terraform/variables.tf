variable "region" {
  type    = string
  default = "eu-west-2"
}

variable "project" {
  type    = string
  default = "landing"
}

variable "website_origin" {
  type        = string
  description = "Exact origin allowed by CORS, e.g. https://example.com"
}