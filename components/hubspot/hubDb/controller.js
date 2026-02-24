/* eslint-disable no-undef */
/* eslint-disable no-constant-condition */
/* eslint-disable no-magic-numbers */
/* eslint-disable no-unused-vars */
const hubspot = require('@hubspot/api-client');
require('dotenv').config();

const hubspotClient = new hubspot.Client({ accessToken: process.env.HS_TOKEN });

module.exports = {
  read: async (table, id = undefined, options) => {
    const limit = options.limit || 100;
    const after = options?.after;
    const properties = options?.properties;
    const sort = options?.sort;

    let i = 0;
    let maxTries = 10;
    if (id) {
      while (true) {
        try {
          const response = await hubspotClient.cms.hubdb.rowsApi.getTableRow(
            table,
            id
          );
          return response;
        } catch (error) {
          if (error?.code === 404) return undefined;
          if (error.code === 429) {
            i++;
            if (i >= maxTries) return { error };
            await new Promise(resolve => setTimeout(resolve, 500));
          } else return { error };
        }
      }
    }

    while (true) {
      try {
        const response = await hubspotClient.cms.hubdb.rowsApi.getTableRows(
          table,
          sort,
          after,
          limit,
          properties
        );
        return response;
      } catch (error) {
        if (error.code === 429) {
          i++;
          if (i >= maxTries) return { error };
          await new Promise(resolve => setTimeout(resolve, 500));
        } else return { error };
      }
    }
  },

  upsert: async (table, values, path, name, id = undefined) => {
    if (!values) throw { status: 400 };
    if (id) {
      let i = 0;
      let maxTries = 10;
      while (true) {
        try {
          const update =
            await hubspotClient.cms.hubdb.rowsApi.updateDraftTableRow(
              table,
              id,
              { path, name, values }
            );

          // Removed automatic publish for performance
          return update;
        } catch (error) {
          if (error.code === 400) return undefined;
          if (error.code === 429) {
            i++;
            if (i >= maxTries) return { error };
            await new Promise(resolve => setTimeout(resolve, 500));
          } else return { error };
        }
      }
    }

    let i = 0;
    let maxTries = 10;
    while (true) {
      try {
        const create = await hubspotClient.cms.hubdb.rowsApi.createTableRow(
          table,
          { path, name, values }
        );

        // Removed automatic publish for performance
        return create;
      } catch (error) {
        if (error.code === 429) {
          i++;
          if (i >= maxTries) return { error };
          await new Promise(resolve => setTimeout(resolve, 500));
        } else return { error };
      }
    }
  },

  remove: async (table, ids) => {
    let i = 0;
    let maxTries = 10;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        let lastResponse;
        for (const rowId of ids) {
          lastResponse =
            await hubspotClient.cms.hubdb.rowsApi.purgeDraftTableRow(
              table,
              rowId
            );
        }
        // Removed automatic publish for performance
        return lastResponse;
      } catch (error) {
        if (error.code === 429) {
          i++;
          if (i >= maxTries) return { error };
          await new Promise(resolve => setTimeout(resolve, 500));
        } else return { error };
      }
    }
  },

  publish: async (table) => {
    let i = 0;
    let maxTries = 10;
    while (true) {
      try {
        const response = await hubspotClient.cms.hubdb.tablesApi.publishDraftTable(table);
        return response;
      } catch (error) {
        if (error.code === 429) {
          i++;
          if (i >= maxTries) return { error };
          await new Promise(resolve => setTimeout(resolve, 500));
        } else return { error };
      }
    }
  }
};
