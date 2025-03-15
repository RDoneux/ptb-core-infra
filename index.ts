import { ResourceGroup } from "@pulumi/azure/core";
import { Subnet, VirtualNetwork } from "@pulumi/azure/network";
import { FlexibleServer } from '@pulumi/azure/mysql';
import { Zone } from '@pulumi/azure/privatedns/zone';
import { ZoneVirtualNetworkLink } from '@pulumi/azure/privatedns/zoneVirtualNetworkLink';
import { Config } from "@pulumi/pulumi";

const config = new Config();

const azureConfig = new Config('azure');
const location = azureConfig.require('location');
const prefix = config.require('prefix');

// https://www.pulumi.com/registry/packages/azure/api-docs/core/resourcegroup/
const resourceGroup = new ResourceGroup(`${prefix}-resource-group`, {
  location
});

// https://www.pulumi.com/registry/packages/azure/api-docs/network/virtualnetwork/
const virtualNetwork = new VirtualNetwork(`${prefix}-vnet`, {
  resourceGroupName: resourceGroup.name,
  location: resourceGroup.location,
  addressSpaces: ["10.0.0.0/16"],
});

// https://www.pulumi.com/registry/packages/azure/api-docs/network/subnet/
const privateSubnet = new Subnet(`${prefix}-private-subnet`, {
  resourceGroupName: resourceGroup.name,
  virtualNetworkName: virtualNetwork.name,
  addressPrefixes: ["10.0.1.0/24"],
  delegations: [
    {
      name: "container-instance-delegation",
      serviceDelegation: {
        actions: ["Microsoft.Network/virtualNetworks/subnets/join/action"],
        name: "Microsoft.ContainerInstance/containerGroups",
      },
    },
  ],
});

// https://www.pulumi.com/registry/packages/azure/api-docs/network/subnet/
const dbSubnet = new Subnet(`${prefix}-db-subnet`, {
  resourceGroupName: resourceGroup.name,
  virtualNetworkName: virtualNetwork.name,
  addressPrefixes: ["10.0.2.0/24"],
  delegations: [
    {
      name: "mysql-flexible-server-delegation",
      serviceDelegation: {
        actions: ["Microsoft.Network/virtualNetworks/subnets/join/action"],
        name: "Microsoft.DBforMySQL/flexibleServers",
      },
    },
  ],
});

// https://www.pulumi.com/registry/packages/azure/api-docs/dns/zone/
const dbZone = new Zone(`${prefix}-db-zone`, {
  name: "dbzone.mysql.database.azure.com",
  resourceGroupName: resourceGroup.name,
});

// https://www.pulumi.com/registry/packages/azure/api-docs/privatedns/zonevirtualnetworklink/
const zoneVirtualNetworkLink = new ZoneVirtualNetworkLink(`${prefix}-zvnl`, {
  name: "vnetZone.com",
  privateDnsZoneName: dbZone.name,
  virtualNetworkId: virtualNetwork.id,
  resourceGroupName: resourceGroup.name,
});

// https://www.pulumi.com/registry/packages/azure/api-docs/mysql/flexibleserver/
const mysqlServer = new FlexibleServer(`${prefix}-db`, {
  resourceGroupName: resourceGroup.name,
  location: resourceGroup.location,
  administratorLogin: config.require('administratorLogin'),
  administratorPassword: config.requireSecret('administratorPassword'),
  skuName: "B_Standard_B1ms",
  version: "8.0.21",
  delegatedSubnetId: dbSubnet.id,
  privateDnsZoneId: dbZone.id
}, {
  dependsOn: [zoneVirtualNetworkLink],
});

export const databaseServer = mysqlServer
export const virtualNetworkId = virtualNetwork.id;
export const privateSubnetId = privateSubnet.id;
