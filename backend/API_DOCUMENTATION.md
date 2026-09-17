# Backend API Documentation

This document provides a detailed overview of the API endpoints exposed by the backend service.

## Base URL

`http://localhost:3000/api/v1` (or your deployed backend URL)

## Authentication Endpoints

### 1. Register User

-   **Endpoint**: `/auth/register`
-   **Method**: `POST`
-   **Description**: Registers a new user in the system.
-   **Request Body (JSON)**:
    ```json
    {
      "email": "user@example.com",
      "password": "securepassword123"
    }
    ```
-   **Success Response (201 Created)**:
    ```json
    {
      "user": {
        "id": "<user_id>",
        "email": "user@example.com",
        "role": "user"
      },
      "token": "<jwt_token>"
    }
    ```
-   **Error Response (400 Bad Request)**:
    ```json
    {
      "error": "User already exists"
    }
    ```

### 2. Login User

-   **Endpoint**: `/auth/login`
-   **Method**: `POST`
-   **Description**: Authenticates a user and returns a JWT token.
-   **Request Body (JSON)**:
    ```json
    {
      "email": "user@example.com",
      "password": "securepassword123"
    }
    ```
-   **Success Response (200 OK)**:
    ```json
    {
      "user": {
        "id": "<user_id>",
        "email": "user@example.com",
        "role": "user"
      },
      "token": "<jwt_token>"
    }
    ```
-   **Error Response (401 Unauthorized)**:
    ```json
    {
      "error": "Invalid credentials"
    }
    ```

### 3. Get User Profile

-   **Endpoint**: `/auth/profile`
-   **Method**: `GET`
-   **Description**: Retrieves the profile information of the authenticated user.
-   **Headers**:
    -   `Authorization`: `Bearer <jwt_token>`
-   **Success Response (200 OK)**:
    ```json
    {
      "_id": "<user_id>",
      "email": "user@example.com",
      "role": "user",
      "createdAt": "2023-01-01T12:00:00.000Z",
      "updatedAt": "2023-01-01T12:00:00.000Z",
      "__v": 0
    }
    ```
-   **Error Response (401 Unauthorized)**:
    ```json
    {
      "error": "Please authenticate."
    }
    ```

## Document Management Endpoints

### 1. Upload Document

-   **Endpoint**: `/document/upload`
-   **Method**: `POST`
-   **Description**: Uploads a new document to the system. Supports `multipart/form-data`.
-   **Headers**:
    -   `Authorization`: `Bearer <jwt_token>`
    -   `Content-Type`: `multipart/form-data`
-   **Request Body (Form Data)**:
    -   `file`: (File) The document file to upload (PDF, DOCX, or plain text).
-   **Success Response (201 Created)**:
    ```json
    {
      "id": "<document_id>",
      "filename": "example.pdf",
      "metadata": {
        "fileType": "pdf",
        "fileSize": "10240"
      },
      "createdAt": "2023-01-01T12:00:00.000Z"
    }
    ```
-   **Error Response (400 Bad Request)**:
    ```json
    {
      "error": "No file uploaded"
    }
    ```
-   **Error Response (500 Internal Server Error)**:
    ```json
    {
      "error": "Error uploading document"
    }
    ```

### 2. Get All Documents

-   **Endpoint**: `/document`
-   **Method**: `GET`
-   **Description**: Retrieves a paginated list of documents uploaded by the authenticated user.
-   **Headers**:
    -   `Authorization`: `Bearer <jwt_token>`
-   **Query Parameters** (all optional):
    -   `page`: Page number (default `1`).
    -   `limit`: Results per page (default `10`).
    -   `search`: Full-text search over document content.
-   **Success Response (200 OK)**:
    ```json
    {
      "documents": [
        {
          "_id": "<document_id_1>",
          "filename": "document1.pdf",
          "userId": "<user_id>",
          "metadata": { "fileType": "pdf", "fileSize": "10240" },
          "createdAt": "2023-01-01T12:00:00.000Z"
        }
      ],
      "totalPages": 1,
      "currentPage": 1
    }
    ```
-   **Error Response (401 Unauthorized)**:
    ```json
    {
      "error": "Please authenticate."
    }
    ```

### 3. Get Document by ID

-   **Endpoint**: `/document/:id`
-   **Method**: `GET`
-   **Description**: Retrieves a specific document by its ID, including its extracted content.
-   **Headers**:
    -   `Authorization`: `Bearer <jwt_token>`
-   **Path Parameters**:
    -   `id`: The ID of the document to retrieve.
-   **Success Response (200 OK)**:
    ```json
    {
      "_id": "<document_id>",
      "filename": "example.pdf",
      "userId": "<user_id>",
      "metadata": { "fileType": "pdf", "fileSize": "10240" },
      "createdAt": "2023-01-01T12:00:00.000Z",
      "content": "Extracted text content of the document..."
    }
    ```
-   **Error Response (404 Not Found)**:
    ```json
    {
      "error": "Document not found"
    }
    ```

### 4. Delete Document

-   **Endpoint**: `/document/:id`
-   **Method**: `DELETE`
-   **Description**: Deletes a specific document (and its stored chunks) by its ID.
-   **Headers**:
    -   `Authorization`: `Bearer <jwt_token>`
-   **Path Parameters**:
    -   `id`: The ID of the document to delete.
-   **Success Response (200 OK)**:
    ```json
    {
      "message": "Document deleted successfully"
    }
    ```
-   **Error Response (404 Not Found)**:
    ```json
    {
      "error": "Document not found"
    }
    ```

## Chat & Conversations Endpoints

### 1. Create Chat Session

-   **Endpoint**: `/chat/sessions`
-   **Method**: `POST`
-   **Description**: Creates a new chat session for the authenticated user.
-   **Headers**:
    -   `Authorization`: `Bearer <jwt_token>`
-   **Request Body (JSON)**:
    ```json
    {
      "title": "Optional session title"
    }
    ```
-   **Success Response (201 Created)**: the created chat session document, e.g.
    ```json
    {
      "_id": "<session_id>",
      "userId": "<user_id>",
      "title": "New Chat",
      "messages": [],
      "createdAt": "2023-01-01T12:00:00.000Z",
      "updatedAt": "2023-01-01T12:00:00.000Z"
    }
    ```

### 2. Send Chat Message

-   **Endpoint**: `/chat/sessions/:sessionId/messages`
-   **Method**: `POST`
-   **Description**: Sends a message within an existing chat session and gets a RAG-grounded response.
-   **Headers**:
    -   `Authorization`: `Bearer <jwt_token>`
-   **Path Parameters**:
    -   `sessionId`: The ID of the chat session.
-   **Request Body (JSON)**:
    ```json
    {
      "message": "What is the capital of France?"
    }
    ```
-   **Success Response (200 OK)**:
    ```json
    {
      "message": "The capital of France is Paris.",
      "sources": [
        {
          "documentId": "<doc_id_1>",
          "filename": "example.pdf",
          "relevanceScore": 0.87
        }
      ]
    }
    ```
-   **Error Response (404 Not Found)**:
    ```json
    {
      "error": "Chat session not found"
    }
    ```

### 3. Get All Chat Sessions

-   **Endpoint**: `/chat/sessions`
-   **Method**: `GET`
-   **Description**: Retrieves all chat sessions belonging to the authenticated user.
-   **Headers**:
    -   `Authorization`: `Bearer <jwt_token>`
-   **Success Response (200 OK)**:
    ```json
    {
      "sessions": [
        {
          "_id": "<session_id>",
          "title": "New Chat",
          "createdAt": "2023-01-01T12:00:00.000Z",
          "updatedAt": "2023-01-01T12:00:05.000Z"
        }
      ]
    }
    ```

### 4. Get Chat History

-   **Endpoint**: `/chat/sessions/:sessionId`
-   **Method**: `GET`
-   **Description**: Retrieves the full session, including all messages, for a given session ID.
-   **Headers**:
    -   `Authorization`: `Bearer <jwt_token>`
-   **Path Parameters**:
    -   `sessionId`: The ID of the chat session.
-   **Success Response (200 OK)**:
    ```json
    {
      "_id": "<session_id>",
      "title": "New Chat",
      "messages": [
        {
          "role": "user",
          "content": "Hello, AI!",
          "timestamp": "2023-01-01T12:00:00.000Z"
        },
        {
          "role": "assistant",
          "content": "Hi there! How can I help you today?",
          "timestamp": "2023-01-01T12:00:05.000Z"
        }
      ]
    }
    ```
-   **Error Response (404 Not Found)**:
    ```json
    {
      "error": "Chat session not found"
    }
    ```

### 5. Delete Chat Session

-   **Endpoint**: `/chat/sessions/:sessionId`
-   **Method**: `DELETE`
-   **Description**: Deletes a chat session by its ID.
-   **Headers**:
    -   `Authorization`: `Bearer <jwt_token>`
-   **Path Parameters**:
    -   `sessionId`: The ID of the chat session.
-   **Success Response (200 OK)**:
    ```json
    {
      "success": true
    }
    ```
-   **Error Response (404 Not Found)**:
    ```json
    {
      "error": "Chat session not found"
    }
    ```

### 6. Edit Chat Session Title

-   **Endpoint**: `/chat/sessions/:sessionId`
-   **Method**: `PATCH`
-   **Description**: Updates the title of an existing chat session.
-   **Headers**:
    -   `Authorization`: `Bearer <jwt_token>`
-   **Path Parameters**:
    -   `sessionId`: The ID of the chat session.
-   **Request Body (JSON)**:
    ```json
    {
      "title": "New title"
    }
    ```
-   **Success Response (200 OK)**: the updated chat session document.
-   **Error Response (404 Not Found)**:
    ```json
    {
      "error": "Chat session not found"
    }
    ```