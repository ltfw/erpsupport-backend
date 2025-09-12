pipeline {
    agent any
    environment {
        // Define variables
        DOCKER_COMPOSE_FILE = 'C:/Users/W10/Documents/erpsupport/docker-compose.yml' // Path to docker-compose.yml on the Jenkins host
        GITHUB_REPO = 'https://github.com/ltfw/erpsupport-backend.git'
        SERVICE_NAME = 'backend'
    }
    stages {
        stage('Checkout') {
            steps {
                // Clone the repository
                git branch: 'main', credentialsId: 'github_pat', url: env.GITHUB_REPO
            }
        }
        stage('Build Docker Image') {
            steps {
                // Build the backend Docker image
                sh 'docker build -t backend:latest .'
            }
        }
        stage('Deploy') {
            steps {
                // Stop and remove the existing backend service, then redeploy
                sh """
                docker-compose -f ${DOCKER_COMPOSE_FILE} rm -f ${SERVICE_NAME}
                docker-compose -f ${DOCKER_COMPOSE_FILE} up -d --build ${SERVICE_NAME}
                """
            }
        }
        stage('Cleanup') {
            steps {
                // Remove unused Docker images to save space
                sh 'docker image prune -f'
            }
        }
    }
    post {
        always {
            // Notify on completion (optional)
            echo 'Pipeline completed'
        }
        success {
            echo 'Backend deployment successful'
        }
        failure {
            echo 'Backend deployment failed'
        }
    }
}