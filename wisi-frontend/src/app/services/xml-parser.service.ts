import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class XmlParserService {

  constructor() {}

  async parseXml(xmlString: string): Promise<any> {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
      return this.xmlToObject(xmlDoc.documentElement);
    } catch (error) {
      console.error('Error parsing XML:', error);
      return null;
    }
  }

  private xmlToObject(node: Element): any {
    const result: any = {};
    
    // Agregar atributos
    if (node.attributes.length > 0) {
      for (let i = 0; i < node.attributes.length; i++) {
        const attr = node.attributes[i];
        result[attr.name] = attr.value;
      }
    }
    
    // Agregar contenido de texto si no hay hijos
    if (node.children.length === 0 && node.textContent) {
      return node.textContent.trim();
    }
    
    // Procesar hijos
    const children: any = {};
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      const childName = child.nodeName;
      const childValue = this.xmlToObject(child);
      
      if (children[childName]) {
        if (Array.isArray(children[childName])) {
          children[childName].push(childValue);
        } else {
          children[childName] = [children[childName], childValue];
        }
      } else {
        children[childName] = childValue;
      }
    }
    
    // Combinar atributos y contenido
    return { ...result, ...children };
  }

  parseUsersXml(xmlString: string): any[] {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
      const result = this.xmlToObject(xmlDoc.documentElement);

      if (result && result.UserInfoSearch && result.UserInfoSearch.UserInfo) {
        const users = Array.isArray(result.UserInfoSearch.UserInfo) 
          ? result.UserInfoSearch.UserInfo 
          : [result.UserInfoSearch.UserInfo];
        return users;
      }
      return [];
    } catch (error) {
      console.error('Error parsing users XML:', error);
      return [];
    }
  }

  parseEventsXml(xmlString: string): any[] {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
      const result = this.xmlToObject(xmlDoc.documentElement);

      if (result && result.AcsEventSearch && result.AcsEventSearch.AcsEvent) {
        const events = Array.isArray(result.AcsEventSearch.AcsEvent) 
          ? result.AcsEventSearch.AcsEvent 
          : [result.AcsEventSearch.AcsEvent];
        return events;
      }
      return [];
    } catch (error) {
      console.error('Error parsing events XML:', error);
      return [];
    }
  }

  parsePhotosXml(xmlString: string): any[] {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
      const result = this.xmlToObject(xmlDoc.documentElement);

      if (result && result.PhotoInfoSearch && result.PhotoInfoSearch.PhotoInfo) {
        const photos = Array.isArray(result.PhotoInfoSearch.PhotoInfo) 
          ? result.PhotoInfoSearch.PhotoInfo 
          : [result.PhotoInfoSearch.PhotoInfo];
        return photos;
      }
      return [];
    } catch (error) {
      console.error('Error parsing photos XML:', error);
      return [];
    }
  }
}



