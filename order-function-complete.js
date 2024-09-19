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
      },
      // Regular delivery
  {
    action: 'addDelivery',
    items: order.lineItems.filter(item => !item.variant.attributes?.some(attr => attr.name === 'bulky' && attr.value === true))
      .map(item => ({
        id: item.id,
        quantity: item.quantity
      })),
    parcels: [
      {
        measurements: {
          heightInMillimeter: Math.floor(Math.random() * 500) + 100,
          lengthInMillimeter: Math.floor(Math.random() * 500) + 100,
          widthInMillimeter: Math.floor(Math.random() * 500) + 100,
          weightInGram: Math.floor(Math.random() * 5000) + 500
        },
        trackingData: {
          trackingId: `TRK${Math.floor(Math.random() * 1000000)}`,
          carrier: 'FedEx',
          provider: 'FedEx',
          providerTransaction: `PROV${Math.floor(Math.random() * 1000000)}`,
          isReturn: false
        }
      }
    ]
  },

      {
      action: "changeShipmentState",
      shipmentState: "Ready"
      }

    ];
   
    // Check for bulky items and add bulky delivery action if present
    const bulkyItems = order.lineItems.filter(item => 
      item.variant.attributes?.some(attr => attr.name === 'bulky' && attr.value === true)
    );

    if (bulkyItems.length > 0) {
      actions.push({
        action: 'addDelivery',
        items: bulkyItems.map(item => ({
          id: item.id,
          quantity: item.quantity
        })),
        parcels: [
          {
            measurements: {
              heightInMillimeter: Math.floor(Math.random() * 1000) + 500,
              lengthInMillimeter: Math.floor(Math.random() * 1000) + 500,
              widthInMillimeter: Math.floor(Math.random() * 1000) + 500,
              weightInGram: Math.floor(Math.random() * 20000) + 5000
            },
            trackingData: {
              trackingId: `DHL${Math.floor(Math.random() * 1000000)}`,
              carrier: 'DHL',
              provider: 'DHL',
              providerTransaction: `DHLPROV${Math.floor(Math.random() * 1000000)}`,
              isReturn: false
            }
          }
        ]
      });
    }


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

}


export {
  handler
}