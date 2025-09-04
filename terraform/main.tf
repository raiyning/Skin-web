terraform {
  required_version = ">= 1.6.0"
  required_providers {
    aws     = { source = "hashicorp/aws", version = ">= 5.0" }
    archive = { source = "hashicorp/archive", version = ">= 2.4.0" }
  }
  backend "s3" {
    bucket  = "raiyan-tfstate-06dee1"
    key     = "mailing-list/terraform.tfstate"
    region  = "us-west-2"
    profile = "raiyanspass-admin"
    encrypt = true
  }
}


provider "aws" {
  region  = var.region
  profile = "raiyanspass-admin"
}

# --------------------------
# DynamoDB table
# --------------------------
resource "aws_dynamodb_table" "mailing_list" {
  name         = "${var.project}-mailing-list"
  billing_mode = "PAY_PER_REQUEST" # simplest + cheap for low traffic
  hash_key     = "email"

  attribute {
    name = "email"
    type = "S"
  }

  # Uncomment if you want TTL auto-cleanup of bounced/unsubbed later
  # ttl {
  #   attribute_name = "ttl_epoch"
  #   enabled        = true
  # }
}

resource "aws_dynamodb_table" "rate_limit" {
  name         = "${var.project}-rate-limit"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "key"

  attribute {
    name = "key"
    type = "S"
  }

  ttl {
    attribute_name = "ttl_epoch" # expire counters automatically
    enabled        = true
  }
}

# --------------------------
# IAM role for Lambda
# --------------------------
resource "aws_iam_role" "lambda_exec" {
  name               = "${var.project}-lambda-exec"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume.json
}

data "aws_iam_policy_document" "lambda_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

# Allow logs + PutItem into our table
data "aws_iam_policy_document" "lambda_policy" {
  statement {
    actions   = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"]
    resources = ["*"]
  }
  statement {
    actions   = ["dynamodb:PutItem"]
    resources = [aws_dynamodb_table.mailing_list.arn]
  }
  statement {
    actions   = ["dynamodb:UpdateItem"]
    resources = [aws_dynamodb_table.rate_limit.arn]
  }
}

resource "aws_iam_policy" "lambda_policy" {
  name   = "${var.project}-lambda-policy"
  policy = data.aws_iam_policy_document.lambda_policy.json
}

resource "aws_iam_role_policy_attachment" "attach" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = aws_iam_policy.lambda_policy.arn
}

# --------------------------
# Lambda function
# --------------------------
# Package your handler as a simple zip (no deps needed).
# See build step below.
data "archive_file" "subscribe_zip" {
  type        = "zip"
  source_file = "${path.module}/lambda/index.js"
  output_path = "${path.module}/lambda/function.zip"
}

resource "aws_lambda_function" "subscribe" {
  function_name    = "${var.project}-subscribe"
  role             = aws_iam_role.lambda_exec.arn
  filename         = data.archive_file.subscribe_zip.output_path
  source_code_hash = data.archive_file.subscribe_zip.output_base64sha256


  handler       = "index.handler"
  runtime       = "nodejs20.x"
  architectures = ["arm64"]

  timeout                        = 3
  memory_size                    = 128
  reserved_concurrent_executions = 5  # cap abuse/spend

  environment {
    variables = {
      TABLE_NAME     = aws_dynamodb_table.mailing_list.name
      ALLOWED_ORIGIN = var.website_origin
      RATE_TABLE     = aws_dynamodb_table.rate_limit.name # <—
    }
  }
}

# Public HTTPS URL for the function (cheapest path, no API GW).
resource "aws_lambda_function_url" "subscribe" {
  function_name      = aws_lambda_function.subscribe.function_name
  authorization_type = "NONE"

  cors {
    allow_credentials = false
    allow_headers     = ["content-type"]
    allow_methods     = ["POST"]
    allow_origins     = [var.website_origin] # e.g., https://example.com
    max_age           = 3600
  }
}

output "subscribe_url" {
  value       = aws_lambda_function_url.subscribe.function_url
  description = "POST your form here"
}

resource "aws_cloudwatch_log_group" "lambda" {
  name              = "/aws/lambda/${aws_lambda_function.subscribe.function_name}"
  retention_in_days = 14
}