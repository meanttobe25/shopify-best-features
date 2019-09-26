import React from 'react';
import {ApolloClient} from 'apollo-client';
import {InMemoryCache} from 'apollo-cache-inmemory';
import {ApolloLink} from 'apollo-link';

import {extract} from '@shopify/react-effect/server';
import {Effect} from '@shopify/react-effect';
import {HtmlManager, HtmlContext} from '@shopify/react-html';
import {ApolloProvider, SsrExtractableLink} from '@shopify/react-graphql';
import {mount} from '@shopify/react-testing';

import {GraphQLUniversalProvider} from '../GraphQLUniversalProvider';

jest.mock('@shopify/react-graphql', () => {
  /* eslint-disable typescript/no-var-requires */
  const ApolloClient = require('apollo-client');
  const InMemoryCache = require('apollo-cache-inmemory');
  const ApolloLink = require('apollo-link');
  /* eslint-enable typescript/no-var-requires */

  return {
    ...require.requireActual('@shopify/react-graphql'),
    createGraphQLClient: jest.fn(
      () =>
        new ApolloClient({cache: new InMemoryCache(), link: new ApolloLink()}),
    ),
  };
});

describe('<GraphQLUniversalProvider />', () => {
  it('renders an ApolloProvider with a client created by the factory', () => {
    const clientOptions = {
      cache: new InMemoryCache(),
      link: new ApolloLink(),
    };
    const graphQL = mount(
      <GraphQLUniversalProvider createClientOptions={() => clientOptions} />,
    );

    expect(graphQL).toContainReactComponent(ApolloProvider, {
      client: expect.any(ApolloClient),
    });
  });

  it('serializes the apollo apollo cache and re-uses it to hydrate the cache', async () => {
    const htmlManager = new HtmlManager();

    const cache = new InMemoryCache();
    const clientOptions = {cache, link: new ApolloLink()};

    const graphQLProvider = (
      <GraphQLUniversalProvider createClientOptions={() => clientOptions} />
    );

    const client = mount(graphQLProvider)
      .find(ApolloProvider)!
      .prop('client');

    // Simulated server render
    await extract(graphQLProvider, {
      decorate: (element: React.ReactNode) => (
        <HtmlContext.Provider value={htmlManager}>
          {element}
        </HtmlContext.Provider>
      ),
    });

    const initialData = client.extract();
    const restoreSpy = jest.spyOn(cache, 'restore');

    // Simulated client render (note: same htmlManager, which replaces the way the
    // client would typically read serializations from the DOM on initialization).
    mount(
      <HtmlContext.Provider value={htmlManager}>
        {graphQLProvider}
      </HtmlContext.Provider>,
    );

    expect(restoreSpy).toHaveBeenCalledWith(initialData);
  });

  it('renders an <Effect/> from ApolloBridge', () => {
    const clientOptions = {
      cache: new InMemoryCache(),
      link: new ApolloLink(),
    };
    const graphQL = mount(
      <GraphQLUniversalProvider createClientOptions={() => clientOptions} />,
    );

    expect(graphQL).toContainReactComponent(Effect);
  });

  it('includes createSsrExtractableLink if a link is not present', () => {
    const clientOptions = {
      cache: new InMemoryCache(),
    };

    const client = mount(
      <GraphQLUniversalProvider createClientOptions={() => clientOptions} />,
    )
      .find(ApolloProvider)!
      .prop('client');

    expect(client.link instanceof SsrExtractableLink).toBe(true);
  });
});
