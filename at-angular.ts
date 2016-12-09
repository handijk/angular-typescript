'use strict';

const directiveProperties: string[] = [
    'compile',
    'controller',
    'controllerAs',
    'bindToController',
    'link',
    'priority',
    'replace',
    'require',
    'restrict',
    'scope',
    'template',
    'templateUrl',
    'terminal',
    'transclude'
];

/* tslint:disable:no-any */
export interface IClassAnnotationDecorator {
    (target: any): void;
    (t: any, key: string, index: number): void;
}

function instantiate(moduleName: string, name: string, mode: string): IClassAnnotationDecorator {
    return (target: any): void => {
        angular.module(moduleName)[mode](name, target);
    };
}

export function attachInjects(target: any, ...args: any[]): any {
    (target.$inject || []).forEach((item: string, index: number) => {
        target.prototype[(item.charAt(0) === '$' ? '$' : '$$') + item] = args[index];
    });
    return target;
}

export interface IInjectAnnotation {
    (...args: any[]): IClassAnnotationDecorator;
}

export function inject(...args: string[]): at.IClassAnnotationDecorator {
    return (target: any, key?: string, index?: number): void => {
        if (angular.isNumber(index)) {
            target.$inject = target.$inject || [];
            target.$inject[index] = args[0];
        } else {
            target.$inject = args;
        }
    };
}

export interface IServiceAnnotation {
    (moduleName: string, serviceName: string): IClassAnnotationDecorator;
}

export function service(moduleName: string, serviceName: string): at.IClassAnnotationDecorator {
    return instantiate(moduleName, serviceName, 'service');
}

export interface IControllerAnnotation {
    (moduleName: string, ctrlName: string): IClassAnnotationDecorator;
}

export function controller(moduleName: string, ctrlName: string): at.IClassAnnotationDecorator {
    return instantiate(moduleName, ctrlName, 'controller');
}

export interface IDirectiveAnnotation {
    (moduleName: string, directiveName: string): IClassAnnotationDecorator;
}

export function directive(moduleName: string, directiveName: string): at.IClassAnnotationDecorator {
    return (target: any): void => {
        let config: angular.IDirective;
        const ctrlName: string = angular.isString(target.controller) ? target.controller.split(' ').shift() : null;
        /* istanbul ignore else */
        if (ctrlName) {
            controller(moduleName, ctrlName)(target);
        }
        config = directiveProperties.reduce((
            config: angular.IDirective,
            property: string
        ) => {
            return angular.isDefined(target[property]) ? angular.extend(config, {[property]: target[property]}) :
                config; /* istanbul ignore next */
        }, {controller: target, scope: Boolean(target.templateUrl)});

        angular.module(moduleName).directive(directiveName, () => (config));
    };
}

export interface IClassFactoryAnnotation {
    (moduleName: string, className: string): IClassAnnotationDecorator;
}

export function classFactory(moduleName: string, className: string): at.IClassAnnotationDecorator {
    return (target: any): void => {
        function factory(...args: any[]): any {
            return at.attachInjects(target, ...args);
        }
        /* istanbul ignore else */
        if (target.$inject && target.$inject.length > 0) {
            factory.$inject = target.$inject.slice(0);
        }
        angular.module(moduleName).factory(className, factory);
    };
}
/* istanbul ignore next */
type ResourceClass = angular.resource.IResourceClass<any>;
type ResourceArray = angular.resource.IResourceArray<any>;
type ResourceService = angular.resource.IResourceService;

/* istanbul ignore next */
function combineResource(instance: any, model?: any): void {
    angular.extend(instance, new instance.$_Resource(model));
}

/* istanbul ignore next */
export class Resource implements angular.resource.IResource<Resource> {
    public static get: (params?: Object) => Resource;
    public static query: (params?: Object) => ResourceArray;
    public static remove: () => Resource;
    public static save: () => Resource;
    public static delete: () => Resource;
    public $get: (params?: Object) => angular.IPromise<this>;
    public $query: (params?: Object) => angular.IPromise<angular.resource.IResourceArray<this>>;
    public $remove: (params?: Object) => angular.IPromise<this>;
    public $save: (params?: Object) => angular.IPromise<this>;
    public $delete: (params?: Object) => angular.IPromise<this>;
    public $promise: angular.IPromise<this>;
    public $resolved: boolean;
    public $cancelRequest: () => void;
    public toJSON: () => this;
    constructor(model?: any) { combineResource(this, model); }
}

/* istanbul ignore next */
export class ResourceWithUpdate extends Resource  {
    public static update: () => ResourceWithUpdate;
    public $update: () => angular.IPromise<this>;
    public $promise : angular.IPromise<this>;
    constructor(model?: any) { super(model); }
}

export interface IResourceAnnotation {
    (moduleName: string, className: string): IClassAnnotationDecorator;
}

export function resource(moduleName: string, className: string): IClassAnnotationDecorator {
    return (target: any): void => {
        function resourceClassFactory($resource: ResourceService, ...args: any[]): any {
            const newResource: ResourceClass = $resource(target.url, target.params, target.actions, target.options);
            return attachInjects(angular.extend(newResource, angular.extend(target, newResource, {
                prototype: angular.extend(newResource.prototype, angular.extend(target.prototype, {
                    /* tslint:disable:variable-name */
                    $_Resource: newResource
                    /* tslint:enable:variable-name */
                }))
            })), ...args);
        }
        resourceClassFactory.$inject = (['$resource']).concat(target.$inject /* istanbul ignore next */ || []);
        angular.module(moduleName).factory(className, resourceClassFactory);
    };
}
/* tslint:enable:no-any */