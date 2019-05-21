import uuidv4 from "uuid/v4";

export default {
  Query: {
    messages: (parent, args, { models }) => {
      return Object.values(models.messages);
    },
    message: (parent, { id }, { models }) => {
      return models.messages[id];
    }
  },

  Mutation: {
    createMessage: (parent, { text }, { me, models }) => {
      const id = uuidv4();
      const message = {
        id,
        text,
        userId: me.id
      };

      models.messages[id] = message;
      models.users[me.id].messageIds.push(id);

      return message;
    },

    deleteMessage: (parent, { id }, { models }) => {
      const { [id]: message, ...otherMessages } = models.messages;

      if (!message) {
        return false;
      }

      models.messages = otherMessages;

      return true;
    },
    updateMessage: (parent, { id, text }, { models }) => {
      const { [id]: message, ...otherMessages } = models.messages;

      if (!message) {
        return {};
      }

      message["text"] = text;
      models.messages[id] = message;

      return message;
    }
  },

  Message: {
    user: (message, args, { models }) => {
      return models.users[message.userId];
    }
  }
};
