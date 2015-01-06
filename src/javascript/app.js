Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',
    logger: new Rally.technicalservices.Logger(),
    items: [
        {xtype:'container',itemId:'display_box'},
        {xtype:'tsinfolink'}
    ],
    portfolioItemTypes: [],
    displayNameMapping: {},
    stateFieldMapping: {},
    launch: function() {
        this._initializeConfig(); 
        this._fetchDataInChunks().then({
            scope: this, 
            success: function(data){
               this._buildGrid(data);
            },
            failure: function(error){}
        });
    },
    _initializeConfig: function(){
        this.portfolioItemTypes = ['PortfolioItem/Theme','PortfolioItem/Initiative','PortfolioItem/Feature'];
        
        Ext.each(this.portfolioItemTypes, function(pi){
            this.displayNameMapping[pi] = pi.replace('PortfolioItem/','');
            this.stateFieldMapping[pi] = 'State';
        },this);
        
        this.displayNameMapping['HierarchicalRequirement'] = 'User Story';
        this.stateFieldMapping['HierarchicalRequirement'] = 'ScheduleState';
        this.logger.log('_initializeConfig',this.displayNameMapping,this.stateFieldMapping);
    },
    _buildGrid: function(data){
        
        var grid_store = this._buildGridStore(data);
        this.down('#display_box').add({
            xtype: 'rallygrid',
            itemId: 'grid-stats',
            columnCfgs: this._getGridColumnConfigs(),
            store: grid_store,
            showPagingToolbar: false, 
            listeners: {
                scope: this,
                viewready: this._updateSparklines,
                afterlayout: function(grid){
                    console.log('afterlayout');
                    //grid.doLayout();
                }
                
            }
        });
        
    },
    _updateSparklines: function(grid){
        this.logger.log('viewready');
        var divs = Ext.query('.sparkline');
        var promises = []; 
        
        Ext.each(divs, function(div){
            console.log(div.id);

            var index = div.id.match(/-row-([0-9]+)$/)[1];
            var rec = grid.getStore().getAt(index);
            
            this._createSparkline(rec, div.id);
        }, this);
    },
    _createSparkline: function(rec, id){
        
        var series = [];
        var categories = []; 

        //Column
       //var series: [{data: [1,2,3,4]}];
       //var categories: ['A','B','C','D']; 
//        var series_data = [];
//         var chart_type = 'column';
//        Ext.Object.each(rec.get('stats'),function(key,val){
//            series_data.push(val);
//            categories.push(key);
//        });
//        series.push({name: '', data: series_data});
        
        //Bar
        //var series = [{name: 'Z', data: [1]},{name: 'Y', data: [2]}];
//        var chart_type = 'bar';
//        Ext.Object.each(rec.get('stats'),function(key,val){
//            series.push({name: key, data: [val]});
//        });
        
        //Pie
        var chart_type = 'pie';
        var series_data = [];  
        Ext.Object.each(rec.get('stats'),function(key,val){
            series_data.push([key,val]);
        });
        series.push({type:'pie', data: series_data});
        
        new Rally.ui.chart.Chart({
            renderTo: id,
            id: Ext.id(),
            chartData: {
               series: series,
               categories: categories
            },
            chartConfig: {
                chart: {
                    backgroundColor: null,
                    borderWidth: 0,
                    type: chart_type,
                    margin: [2, 0, 2, 0],
                    width: 400,
                    height: 60,
                    style: {
                        overflow: 'visible'
                    },
                    skipClone: true
                },
                title: {
                    text: ''
                },
                plotOptions: {
                     pie: {
                        dataLabels: {
                            enabled: false
                        },
                        showInLegend: true
                     }
                },
                legend: {
                    enabled: false, 
                    align: 'right',
                    verticalAlign: 'middle'
                }
//                    bar: {
//                        stacking: "normal",
//                        pointWidth: 10,
//                        dataLabels: {
//                            enabled: true,
//                            align: 'right',
//                            x: 10,
//                            y: function(){ console.log(point.x); return -5 * point.x;},
//                            format: '<span style="color:{series.color}">\u25CF {series.name}</span>: <b>{point.y}</b>',
//                        }
//                    }
//                },
//                tooltip: {
//                    backgroundColor: null,
//                    borderWidth: 0,
//                    shadow: false,
//                    useHTML: true,
//                    hideDelay: 0,
//                    shared: true,
//                    padding: 0,
////                    positioner: function (w, h, point) {
////                        return { x: point.plotX - w / 2, y: point.plotY};
////                    },
////                     formatter: '<span style="color:{series.color}">\u25CF</span> {series.name}: <b>{point.y}</b>'
//                },
//                yAxis: [
//                    {
//                        title: {
//                            text: null
//                        },
//                        labels: {
//                            enabled: false 
//                        },
//                        endOnTick: false,
//                        startOnTick: false,
//                        tickPositions: []
//                    }
//                ]
            }
        });
    },
    _getGridColumnConfigs: function(){
        return [{
            text: 'Type',
            dataIndex: 'type',
            scope: this,
            renderer: function(v,m,r){
                return this.displayNameMapping[v];
            }
        },{
            text: 'Total',
            dataIndex: 'total'
        },{
            xtype: 'sparklinecolumn',
            text: 'Statistics',
            dataIndex: 'stats',
            flex: 1,
            tpl: Ext.String.format('<tpl><div id="{[Ext.id()]}-row-{row}" class="sparkline"></div></tpl>')
        }];
    },
    _buildGridStore: function(data){
        var store_data = [];  
        
        Ext.each(data, function(d){
            var type = d.type;  
            var state_field = this.stateFieldMapping[type];
            var counts = {};
            var total = 0;
            Ext.each(d.data, function(rec){
                var state = rec.get(state_field);
                if (state.length == 0){
                    state = "None";
                }
                if (counts[state] == undefined){
                    counts[state] = 0;
                }
                counts[state]++;  
                total++;
            },this);
            var custom_rec = {type: type, total: total, stats: counts};
            store_data.push(custom_rec);
        },this);
        this.logger.log('_buildGridStore',store_data);
        return Ext.create('Rally.data.custom.Store',{
            data: store_data
        });
    },
    _fetchData: function(){
        this.logger.log('_fetchData Start');
        var deferred = Ext.create('Deft.Deferred');
        Ext.create('Rally.data.lookback.SnapshotStore', {
            listeners: {
                scope: this,
                load: function(store, data, success) {
                    this.logger.log('_fetchData load',store,data,success);
                    if (success) {
                        deferred.resolve();
                    } else {
                        deferred.reject('Error loading artifact data');
                    }
                }
            },
            fetch: ['_TypeHierarchy','FormattedID', 'State', 'ObjectID','ScheduleState'],
            find: { 
                "_TypeHierarchy": {"$in": ['PortfolioItem','HierarchicalRequirement']},
                    "__At": "current"
            },
            hydrate: ["State"],
            autoLoad: true
        });
        
        return deferred; 
    },
    _fetchDataInChunks: function(){
        var deferred = Ext.create('Deft.Deferred');
        
        this.logger.log('_fetchDataInChunks Start');
        var promises = [];
        Ext.each(Object.keys(this.stateFieldMapping), function(key){
            promises.push(this._fetchData3(key,this.stateFieldMapping[key]));
        },this);
        
        Deft.Promise.all(promises).then({
            scope: this,
            success: function(data){
                this.logger.log('_fetchDataInChunks End',data);
                deferred.resolve(data);
            },
            failure: function(){}
        });        
        return deferred; 
    },

    _fetchData3: function(typeHierarchy, summaryField){
        var deferred = Ext.create('Deft.Deferred');
        this.logger.log('_fetchData',typeHierarchy,summaryField);
        Ext.create('Rally.data.lookback.SnapshotStore', {
            listeners: {
                scope: this,
                load: function(store, data, success) {
                   // this.logger.log('_fetchData load',store,data,success);
                    if (success) {
                        deferred.resolve({type: typeHierarchy, data: data});
                    } else {
                        deferred.reject('Error loading artifact data');
                    }
                }
            },
            fetch: [summaryField],
            find: { 
                "_TypeHierarchy": typeHierarchy,
                "__At": "current"
            },
            hydrate: [summaryField],
            autoLoad: true
        });
        
        return deferred; 
    }
});