# Chat API Documentation

Real-time chat system with WebSocket and REST API support.

## Overview

- **WebSocket Namespace**: `/chat`
- **REST Base Path**: `/api/chat`
- **Authentication**: JWT Bearer token (required for all endpoints)
- **Message Encryption**: AES-256-CBC (handled server-side, transparent to clients)

---

## Authentication

All endpoints and WebSocket connections require a valid JWT token.

### REST API
```
Authorization: Bearer <jwt_token>
```

### WebSocket
```javascript
const socket = io('http://localhost:3003/chat', {
  auth: { token: '<jwt_token>' },
  transports: ['websocket', 'polling']
});
```

---

## REST API Endpoints

### Conversations

#### Create Conversation
```
POST /api/chat/conversations
```

**Request Body:**
```json
{
  "type": "DIRECT" | "GROUP",
  "participantIds": ["uuid1", "uuid2"],
  "name": "Group Name"  // Required for GROUP, ignored for DIRECT
}
```

**Notes:**
- `DIRECT`: Requires exactly 1 participantId (the other user)
- `GROUP`: Requires at least 1 participantId and a name
- For DIRECT, returns existing conversation if one already exists

**Response:**
```json
{
  "success": true,
  "status": 201,
  "data": {
    "id": "uuid",
    "type": "DIRECT",
    "name": null,
    "createdAt": "2024-01-15T10:30:00Z",
    "participants": [
      {
        "id": "uuid",
        "isAdmin": true,
        "user": {
          "id": "uuid",
          "firstName": "John",
          "lastName": "Doe",
          "phoneNumber": "+905551234567"
        }
      }
    ]
  }
}
```

---

#### List Conversations
```
GET /api/chat/conversations?take=20&skip=0&type=DIRECT
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| take | number | 20 | Number of items per page |
| skip | number | 0 | Number of items to skip |
| type | string | - | Filter by type: `DIRECT` or `GROUP` |

**Response:**
```json
{
  "success": true,
  "status": 200,
  "data": [
    {
      "id": "uuid",
      "type": "DIRECT",
      "name": null,
      "lastMessageAt": "2024-01-15T10:30:00Z",
      "unreadCount": 3,
      "lastMessage": {
        "id": "uuid",
        "content": "Hello!",
        "senderID": "uuid",
        "createdAt": "2024-01-15T10:30:00Z"
      },
      "participants": [...]
    }
  ],
  "count": 15
}
```

---

#### Get Conversation Details
```
GET /api/chat/conversations/:id
```

**Response:**
```json
{
  "success": true,
  "status": 200,
  "data": {
    "id": "uuid",
    "type": "GROUP",
    "name": "Project Team",
    "avatarFileID": "uuid",
    "createdAt": "2024-01-15T10:30:00Z",
    "participants": [
      {
        "id": "uuid",
        "isAdmin": true,
        "joinedAt": "2024-01-15T10:30:00Z",
        "user": {
          "id": "uuid",
          "firstName": "John",
          "lastName": "Doe",
          "phoneNumber": "+905551234567"
        }
      }
    ]
  }
}
```

---

#### Update Conversation (Groups Only)
```
PATCH /api/chat/conversations/:id
```

**Request Body:**
```json
{
  "name": "New Group Name",
  "avatarFileId": "uuid"
}
```

**Note:** Only group admins can update.

---

#### Leave Conversation
```
POST /api/chat/conversations/:id/leave
```

**Response:** `204 No Content`

---

### Messages

#### Get Messages
```
GET /api/chat/conversations/:id/messages?take=50&skip=0
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| take | number | 50 | Number of messages |
| skip | number | 0 | Offset for pagination |

**Response:**
```json
{
  "success": true,
  "status": 200,
  "data": [
    {
      "id": "uuid",
      "conversationID": "uuid",
      "senderID": "uuid",
      "type": "TEXT",
      "content": "Hello!",
      "replyToID": null,
      "status": "SENT",
      "isEdited": false,
      "createdAt": "2024-01-15T10:30:00Z",
      "sender": {
        "id": "uuid",
        "firstName": "John",
        "lastName": "Doe"
      },
      "attachments": []
    }
  ],
  "count": 100
}
```

**Note:** Messages are returned in descending order (newest first). Reverse for display.

---

#### Send Message (REST Fallback)
```
POST /api/chat/conversations/:id/messages
```

**Request Body:**
```json
{
  "content": "Hello!",
  "type": "TEXT",
  "replyToId": "uuid",
  "attachmentIds": ["uuid1", "uuid2"]
}
```

**Message Types:**
- `TEXT` - Plain text message
- `IMAGE` - Image attachment
- `FILE` - File attachment
- `AUDIO` - Audio message
- `VIDEO` - Video attachment

**Note:** Prefer WebSocket for real-time messaging. REST is for fallback.

---

#### Edit Message
```
PATCH /api/chat/messages/:id
```

**Request Body:**
```json
{
  "content": "Updated message"
}
```

**Note:** Only the sender can edit their own messages.

---

#### Delete Message
```
DELETE /api/chat/messages/:id
```

**Response:** `204 No Content`

**Note:** Soft delete - message marked as deleted but kept in database.

---

#### Mark Messages as Read
```
PATCH /api/chat/messages/read
```

**Request Body:**
```json
{
  "conversationId": "uuid",
  "messageIds": ["uuid1", "uuid2"]
}
```

---

### Participants (Groups Only)

#### Add Participant
```
POST /api/chat/conversations/:id/participants
```

**Request Body:**
```json
{
  "userId": "uuid",
  "isAdmin": false
}
```

**Note:** Only group admins can add participants.

---

#### Remove Participant
```
DELETE /api/chat/conversations/:id/participants/:userId
```

**Note:** Admins can remove anyone. Users can only remove themselves.

---

## WebSocket Events

### Connection

```javascript
const socket = io('http://localhost:3003/chat', {
  auth: { token: '<jwt_token>' },
  transports: ['websocket', 'polling']
});

// Connection successful
socket.on('connection:ack', (data) => {
  console.log('Connected as user:', data.userId);
});

// Connection error
socket.on('error', (error) => {
  console.error('Error:', error.code, error.message);
});
```

---

### Client → Server Events

#### Send Message
```javascript
socket.emit('message:send', {
  conversationId: 'uuid',
  content: 'Hello!',
  type: 'TEXT',           // Optional, default: TEXT
  replyToId: 'uuid',      // Optional
  attachmentIds: ['uuid'] // Optional
}, (response) => {
  if (response.success) {
    console.log('Message sent:', response.message);
  } else {
    console.error('Failed:', response.error);
  }
});
```

**Response Callback:**
```json
{
  "success": true,
  "message": {
    "id": "uuid",
    "conversationId": "uuid",
    "senderId": "uuid",
    "senderName": "John Doe",
    "type": "TEXT",
    "content": "Hello!",
    "status": "SENT",
    "createdAt": "2024-01-15T10:30:00Z",
    "isEdited": false,
    "attachments": []
  }
}
```

---

#### Mark as Read
```javascript
socket.emit('message:read', {
  conversationId: 'uuid',
  messageIds: ['uuid1', 'uuid2']
});
```

---

#### Typing Indicators
```javascript
// Start typing
socket.emit('typing:start', { conversationId: 'uuid' });

// Stop typing (call after 2-3 seconds of inactivity)
socket.emit('typing:stop', { conversationId: 'uuid' });
```

---

#### Join/Leave Conversation Room
```javascript
// Join (auto-joined on connect, use for switching)
socket.emit('conversation:join', { conversationId: 'uuid' });

// Leave
socket.emit('conversation:leave', { conversationId: 'uuid' });
```

---

### Server → Client Events

#### New Message
```javascript
socket.on('message:new', (message) => {
  // message = {
  //   id, conversationId, senderId, senderName,
  //   type, content, status, createdAt, isEdited,
  //   replyToId, attachments
  // }
});
```

---

#### Message Updated
```javascript
socket.on('message:updated', (message) => {
  // Same structure as message:new
  // isEdited will be true
});
```

---

#### Message Deleted
```javascript
socket.on('message:deleted', (data) => {
  // data = { messageId, conversationId }
});
```

---

#### Read Receipts
```javascript
socket.on('message:read', (data) => {
  // data = { messageIds: [], userId, readAt }
});
```

---

#### Typing Indicators
```javascript
socket.on('typing:start', (data) => {
  // data = { conversationId, userId, userName }
});

socket.on('typing:stop', (data) => {
  // data = { conversationId, userId }
});
```

---

#### Participant Events
```javascript
socket.on('participant:joined', (data) => {
  // data = { conversationId, participant: {...} }
});

socket.on('participant:left', (data) => {
  // data = { conversationId, userId }
});
```

---

#### Conversation Updated
```javascript
socket.on('conversation:updated', (conversation) => {
  // conversation = { id, type, name, lastMessageAt, participantCount }
});
```

---

## Error Codes

| Code | Description |
|------|-------------|
| `AUTH_FAILED` | JWT token invalid or expired |
| `CONVERSATION_NOT_FOUND` | Conversation does not exist or user not participant |
| `MESSAGE_NOT_FOUND` | Message does not exist |
| `NOT_PARTICIPANT` | User is not a participant in this conversation |
| `NOT_GROUP_ADMIN` | Only group admins can perform this action |
| `NOT_MESSAGE_OWNER` | Can only edit/delete own messages |
| `INVALID_PARTICIPANTS` | One or more participant IDs are invalid |

---

## Complete Frontend Example

```javascript
class ChatService {
  constructor(apiUrl, token) {
    this.apiUrl = apiUrl;
    this.token = token;
    this.socket = null;
    this.currentUserId = null;
  }

  // Connect to WebSocket
  connect() {
    return new Promise((resolve, reject) => {
      this.socket = io(`${this.apiUrl}/chat`, {
        auth: { token: this.token },
        transports: ['websocket', 'polling']
      });

      this.socket.on('connection:ack', (data) => {
        this.currentUserId = data.userId;
        resolve(data);
      });

      this.socket.on('connect_error', (error) => {
        reject(error);
      });

      // Set up event listeners
      this.socket.on('message:new', (msg) => this.onNewMessage(msg));
      this.socket.on('message:updated', (msg) => this.onMessageUpdated(msg));
      this.socket.on('message:deleted', (data) => this.onMessageDeleted(data));
      this.socket.on('typing:start', (data) => this.onTypingStart(data));
      this.socket.on('typing:stop', (data) => this.onTypingStop(data));
    });
  }

  // Disconnect
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // REST API call helper
  async api(method, endpoint, body = null) {
    const options = {
      method,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      }
    };
    if (body) options.body = JSON.stringify(body);

    const response = await fetch(`${this.apiUrl}/api${endpoint}`, options);
    return response.json();
  }

  // Get conversations
  async getConversations(take = 20, skip = 0) {
    const result = await this.api('GET', `/chat/conversations?take=${take}&skip=${skip}`);
    return result.data || [];
  }

  // Create direct conversation
  async createDirectChat(userId) {
    const result = await this.api('POST', '/chat/conversations', {
      type: 'DIRECT',
      participantIds: [userId]
    });
    return result.data;
  }

  // Create group conversation
  async createGroupChat(name, participantIds) {
    const result = await this.api('POST', '/chat/conversations', {
      type: 'GROUP',
      name,
      participantIds
    });
    return result.data;
  }

  // Get messages
  async getMessages(conversationId, take = 50, skip = 0) {
    const result = await this.api('GET',
      `/chat/conversations/${conversationId}/messages?take=${take}&skip=${skip}`
    );
    return (result.data || []).reverse(); // Reverse for chronological order
  }

  // Send message via WebSocket
  sendMessage(conversationId, content, options = {}) {
    return new Promise((resolve, reject) => {
      this.socket.emit('message:send', {
        conversationId,
        content,
        type: options.type || 'TEXT',
        replyToId: options.replyToId,
        attachmentIds: options.attachmentIds
      }, (response) => {
        if (response.success) {
          resolve(response.message);
        } else {
          reject(new Error(response.error));
        }
      });
    });
  }

  // Join conversation room
  joinConversation(conversationId) {
    this.socket.emit('conversation:join', { conversationId });
  }

  // Typing indicators
  startTyping(conversationId) {
    this.socket.emit('typing:start', { conversationId });
  }

  stopTyping(conversationId) {
    this.socket.emit('typing:stop', { conversationId });
  }

  // Event handlers (override these)
  onNewMessage(message) { console.log('New message:', message); }
  onMessageUpdated(message) { console.log('Message updated:', message); }
  onMessageDeleted(data) { console.log('Message deleted:', data); }
  onTypingStart(data) { console.log('Typing started:', data); }
  onTypingStop(data) { console.log('Typing stopped:', data); }
}

// Usage
const chat = new ChatService('http://localhost:3003', 'your-jwt-token');

chat.onNewMessage = (message) => {
  // Add message to UI
  appendMessage(message);
};

chat.onTypingStart = (data) => {
  showTypingIndicator(data.userName);
};

await chat.connect();
const conversations = await chat.getConversations();
chat.joinConversation(conversations[0].id);
await chat.sendMessage(conversations[0].id, 'Hello!');
```

---

## Data Types

### ConversationType
```typescript
enum ConversationType {
  DIRECT = 'DIRECT',
  GROUP = 'GROUP'
}
```

### MessageType
```typescript
enum MessageType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  FILE = 'FILE',
  AUDIO = 'AUDIO',
  VIDEO = 'VIDEO'
}
```

### MessageStatus
```typescript
enum MessageStatus {
  SENDING = 'SENDING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
  FAILED = 'FAILED'
}
```
