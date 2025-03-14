import { ResourceGroup } from "@pulumi/azure/core";
import { Subnet, VirtualNetwork } from "@pulumi/azure/network";

// Create Resource Group
const resourceGroup = new ResourceGroup("shared-network-rg");

// Create Virtual Network
const vnet = new VirtualNetwork("shared-vnet", {
  resourceGroupName: resourceGroup.name,
  location: resourceGroup.location,
  addressSpaces: ["10.0.0.0/16"],
});

// Create a shared Subnet
const subnet = new Subnet("shared-subnet", {
  resourceGroupName: resourceGroup.name,
  virtualNetworkName: vnet.name,
  addressPrefixes: ["10.0.1.0/24"],
});

// Export values for microservices to use
export const vnetId = vnet.id;
export const subnetId = subnet.id;
