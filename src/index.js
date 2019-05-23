import "dotenv/config";

import http from "http";
import koa from "koa";
import cors from "koa2-cors";
import bodyParser from 'koa-bodyparser';
import Router from 'koa-router';
import koalogger from 'koa-logger';
import helmet from 'koa-helmet';
import { ApolloServer, AuthenticationError } from "apollo-server-koa";
import jwt from "jsonwebtoken";
import DataLoader from "dataloader";

import schema from "./schema";
import resolvers from "./resolvers";
import models, { sequelize } from "./models";
import loaders from "./loaders";

const app = new koa();

app.use(cors());
app.use(helmet());
app.use(koalogger());
app.use(bodyParser());

const getMe = async req => {
  const token = req.headers["x-token"];

  if (token) {
    try {
      return await jwt.verify(token, process.env.SECRET);
    } catch (e) {
      throw new AuthenticationError("Your session expired. Sign in again.");
    }
  }
};

const server = new ApolloServer({
  introspection: true,
  playground: true,
  typeDefs: schema,
  resolvers,
  formatError: error => {
    // remove the internal sequelize error message
    // leave only the important validation error
    const message = error.message
      .replace("SequelizeValidationError: ", "")
      .replace("Validation error: ", "");

    return {
      ...error,
      message
    };
  },
  bodyParser: true,
  context: async ({ ctx, connection }) => {
    if (connection) {
      return {
        models,
        loaders: {
          user: new DataLoader(keys => loaders.user.batchUsers(keys, models))
        }
      };
    }

    if (ctx) {
      const me = await getMe(ctx.request);

      return {
        models,
        me,
        secret: process.env.SECRET,
        loaders: {
          user: new DataLoader(keys => loaders.user.batchUsers(keys, models))
        }
      };
    }
  },
  engine: {
    apiKey: "service:vliegenthart-8202:2Dfk-jXfGENS2O_YN4DVlg"
  }
});

server.applyMiddleware({ app });
const httpServer = http.createServer(app.callback());
server.installSubscriptionHandlers(httpServer);

const isTest = !!process.env.TEST_DATABASE;
const isProduction = !!process.env.DATABASE_URL;
const port = process.env.PORT || 8000;

sequelize.sync({ force: isTest }).then(async () => {
  if (isTest) {
    createUsersWithMessages(new Date());
  }

  httpServer.listen({ port }, () => {
    console.log(`Apollo Server on http://localhost:${port}${server.graphqlPath}`);
  });
});

const createUsersWithMessages = async date => {
  await models.User.create(
    {
      username: "daniel",
      email: "hello@daniel.com",
      password: "danieldaniel",
      role: "ADMIN",
      messages: [
        {
          text: "Published the Road to learn React",
          createdAt: date.setSeconds(date.getSeconds() + 1)
        }
      ]
    },
    {
      include: [models.Message]
    }
  );

  await models.User.create(
    {
      username: "ddavids",
      email: "hello@david.com",
      password: "ddavids",
      messages: [
        {
          text: "Happy to release ...",
          createdAt: date.setSeconds(date.getSeconds() + 1)
        },
        {
          text: "Published a complete ...",
          createdAt: date.setSeconds(date.getSeconds() + 1)
        }
      ]
    },
    {
      include: [models.Message]
    }
  );
};
