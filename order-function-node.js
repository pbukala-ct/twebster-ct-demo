'use strict;'
import dotenv from 'dotenv';
import { apiRoot } from './commercetools.js';

const VERBOSE=true;

dotenv.config({path : process.env.ENV_PATH || '.env'});

const handler = async (event, context) => {
  let message = JSON.parse(Buffer.from(event.data, 'base64').toString());
  
  VERBOSE && console.log('message',JSON.stringify(message));

  let updateOrderId = message.resource.id;
  
  let result = await apiRoot
    .orders()
    .withId({ID: updateOrderId})
    .get()
    .execute();

  if(!result) {
    console.log('Unable to fetch order',message.resource.id);
    return;
  }
  let order = result.body;
  
  VERBOSE && console.log('order',JSON.stringify(order,null,2));
  VERBOSE && console.log ('Preparing Update Actions');

  const currentTimestamp = new Date().toISOString();
  const orderID = `TW_Order_ID_${Math.floor(Math.random() * 1000) + 1}`;
  const FTchanelsIDs = await getFullfilmentChannels();


     // Prepare update actions
    const actions = [
      {
        action: 'changeOrderState',
        orderState: "Confirmed"
        },
        {
        action: 'transitionState',
        state: {
          typeId: "state",
          key: "ordercreated" 
        }
       },
       {
        action: 'changePaymentState',
        paymentState: "Paid"
        },
      {
        action: 'setCustomType',
        type: {
          id: "c4adefae-416e-4bef-8e90-aac4a65ad7b0",
          typeId: "type"
        },
        fields: {
          channel: {
            typeId: "channel",
            id: getRandomChannelId(FTchanelsIDs)
          },
          timestamp: currentTimestamp,
          omsId: orderID
        }
      }
    ];
   
                      //   {
                    //     "action": "changeShipmentState",
                    //     "shipmentState": "Delayed"
                    //     },


  let updateResult = await apiRoot
    .orders()
    .withId({ ID: updateOrderId })
    .post({
        body: {
            version: order.version,
             actions: actions
                }
            })
  .execute()

  if(!updateResult) {
    console.log('Unable to update order', updateOrderId);
    return;
  }

  VERBOSE && console.log('Exiting order update');

};
// Function to get a random channel ID from the list
function getRandomChannelId(channelIds) {
  return channelIds[Math.floor(Math.random() * channelIds.length)];
}


async function getFullfilmentChannels() {
  let channelResults = await apiRoot
        .channels()
        .get({
          queryArgs: {
            where: 'roles contains any ("InventorySupply")',
            expand: ['custom.type', 'custom.fields.isStore'],
            limit: 100 // Adjust as needed
          }
        })
    .execute();

    if(!channelResults) {
        console.log('Unable to fetch channels');
    return;
  } 
   let filteredChannels = channelResults.body.results.filter(channel => 
        channel.custom?.fields?.isStore === true
      );

    console.log('FT channels: ' + JSON.stringify(filteredChannels));

    return filteredChannels.map(channel => channel.id);
  
    //   return filteredChannels.map(channel => ({
    //     id: channel.id,
    //     key: channel.key,
    //     name: channel.name.en || channel.key
    //   }));
}

// Replace this with your actual list of channel IDs
const channelIds = [ '729fd00d-02c0-4d82-8468-fec18651b447', '5728ebb9-0d2d-44c5-97b0-f2d43c917fae','01cacc41-51cc-4fc8-b633-9d4842d48bac'];


export {
  handler
}