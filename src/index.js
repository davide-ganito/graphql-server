import express from 'express';
import session from 'express-session';
import bodyParser from 'body-parser';
import multer from 'multer';

import graphQLHTTP from 'express-graphql';
import { graphql } from 'graphql';
import mongoose from 'mongoose';

import invariant from 'invariant';
import warning from 'warning';

const MongoStore = require('connect-mongo')(session);
const upload = multer();

export default function GraphQLServer( opts = {} ) {

  const {
    session,
    schema,
    pretty,
    rootValue,
    queryLog
  } = Object.assign({
    session : {},
    pretty : false,
    rootValue : {}
  },opts);

  Object.assign( session, {
    passPhrase : 'graphql-server',
    storeDatabase : 'http://localhost/sessions'
  });

  invariant(
    schema,
    `Cannot start the server: GraphQLSchema expected!` );

  warning(
    queryLog,
    `No query log stream provided!` );

  const connection = mongoose.createConnection( storeDatabase );

  const server = express();
  server.use( bodyParser.json() );
  server.use( bodyParser.urlencoded({ extended : true }) );

  // session middleware
  server.use(session({
    secret : passPhrase,
    resave: false,
    saveUninitialized: true,
    store : new MongoStore({
      mongooseConnection : connection
    })
  }));


  // query middleware
  server.use('/', upload.array(), graphQLHTTP((request) => {

    // log query
    const { 
      query, 
      variables 
    } = Object.assign({
      query : '',
      variables : {}
    },request.body);


    if ( queryLog ) {
      queryLog.write(
        `\n---`
        + `\nquery:\n  ${query}`
        + `\n\nvariables:\n  ${JSON.stringify(variables,null,2)}`);
    }

    return {
      schema,
      rootValue : {
        request,
        ...rootValue
      },
      pretty
    }

  }));


  return server;

}