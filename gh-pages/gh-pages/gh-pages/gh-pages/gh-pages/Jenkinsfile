pipeline {
  agent any
  environment {
    S3_BUCKET        = 'finalportfolioproject'
    CF_DISTRIBUTION  = 'E3N79EWAUEVPIW'
    AWS_REGION       = 'us-east-1'
  }
  stages {
    stage('Checkout') {
      steps {
        git url: 'https://github.com/BhujelPratham/portfolio.git',
            branch: 'main',
            credentialsId: 'github-pat'
      }
    }
    stage('Sync to S3') {
      steps {
        withCredentials([[
          $class: 'AmazonWebServicesCredentialsBinding',
          credentialsId: 'aws-creds'
        ]]) {
          sh """
            aws s3 sync . s3://${S3_BUCKET} --delete --acl public-read --region ${AWS_REGION}
          """
        }
      }
    }
    stage('Invalidate CloudFront') {
      steps {
        withCredentials([[
          $class: 'AmazonWebServicesCredentialsBinding',
          credentialsId: 'aws-creds'
        ]]) {
          sh """
            aws cloudfront create-invalidation --distribution-id ${CF_DISTRIBUTION} --paths "/*"
          """
        }
      }
    }
  }
  post {
    success { echo "✅ Deployed & invalidated cache!" }
    failure { echo "❌ Something failed." }
  }
}
